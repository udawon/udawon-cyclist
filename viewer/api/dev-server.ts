/**
 * 로컬 개발용 API 서버.
 * Vite proxy가 /api/chat 요청을 이 서버로 전달.
 * npx tsx api/dev-server.ts 로 실행.
 */
import Anthropic from '@anthropic-ai/sdk'
import { createServer } from 'http'

const PORT = 3001

// 레이트 리밋 (개발용은 넉넉하게)
const IP_WINDOW_MS = 60 * 60 * 1000
const IP_MAX_REQUESTS = 60
const MAX_MESSAGES = 32
const MAX_BODY_LENGTH = 50_000

const ipRequests = new Map<string, { count: number; resetAt: number }>()

function checkIpRate(ip: string): boolean {
  const now = Date.now()
  const record = ipRequests.get(ip)
  if (!record || now > record.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS })
    return true
  }
  if (record.count >= IP_MAX_REQUESTS) return false
  record.count++
  return true
}

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method !== 'POST' || req.url !== '/api/chat') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' }))
    return
  }

  // IP 레이트 리밋
  const ip = req.socket.remoteAddress || 'unknown'
  if (!checkIpRate(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: '요청이 너무 많습니다.' }))
    return
  }

  // body 읽기
  const chunks: Buffer[] = []
  let totalLength = 0
  for await (const chunk of req) {
    totalLength += (chunk as Buffer).length
    if (totalLength > MAX_BODY_LENGTH) {
      res.writeHead(413, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: '요청이 너무 큽니다.' }))
      return
    }
    chunks.push(chunk as Buffer)
  }

  let body: { messages: { role: string; content: string }[]; systemPrompt: string }
  try {
    body = JSON.parse(Buffer.concat(chunks).toString())
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: '잘못된 요청 형식입니다.' }))
    return
  }

  // 구조 검증
  if (!body.messages || !Array.isArray(body.messages) || !body.systemPrompt) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: '필수 필드가 누락되었습니다.' }))
    return
  }

  if (body.messages.length > MAX_MESSAGES) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: '대화가 너무 깁니다.' }))
    return
  }

  try {
    const client = new Anthropic({ apiKey })

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: body.systemPrompt,
      messages: body.messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(event.delta.text)
      }
    }

    res.end()
  } catch (err) {
    console.error('API error:', err)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: String(err) }))
    }
  }
})

server.listen(PORT, () => {
  console.log(`API dev server running at http://localhost:${PORT}`)
})
