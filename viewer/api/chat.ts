import Anthropic from '@anthropic-ai/sdk'

export const config = { runtime: 'edge' }

// --- 계층 2: Edge 레이트 리밋 (인메모리, 인스턴스 단위) ---
const IP_WINDOW_MS = 60 * 60 * 1000 // 1시간
const IP_MAX_REQUESTS = 30 // IP당 1시간 최대 30회 (2세션 × 15라운드)
const MAX_MESSAGES = 32 // 요청 내 최대 메시지 수
const MAX_BODY_LENGTH = 50_000 // 요청 본문 최대 크기 (문자수)
const MAX_SYSTEM_PROMPT_LENGTH = 5_000 // 시스템 프롬프트 최대 길이
const ALLOWED_ROLES = new Set(['user', 'assistant'])

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

// --- 계층 3: IP 기반 일일 세션 제한 (캐시 초기화 우회 방지) ---
const DAILY_SESSION_LIMIT = 2
// key: "ip::YYYY-MM-DD", value: 세션 수
const ipDailySessions = new Map<string, number>()
// 날짜별 전체 세션 합계 (공개 카운터용)
const dailyTotalSessions = new Map<string, number>()

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function getDailySessionKey(ip: string): string {
  return `${ip}::${getTodayStr()}`
}

/** 새 세션 시작 가능 여부 확인 (messages.length === 1 일 때 호출) */
function checkAndRecordSession(ip: string): boolean {
  const key = getDailySessionKey(ip)
  const count = ipDailySessions.get(key) ?? 0
  if (count >= DAILY_SESSION_LIMIT) return false
  ipDailySessions.set(key, count + 1)
  // 전체 카운터 증가
  const today = getTodayStr()
  dailyTotalSessions.set(today, (dailyTotalSessions.get(today) ?? 0) + 1)
  return true
}

/** 오늘 전체 세션 수 반환 */
function getTodayTotalSessions(): number {
  return dailyTotalSessions.get(getTodayStr()) ?? 0
}

// 오래된 항목 주기적 정리 (메모리 누수 방지)
function cleanupIpMap() {
  const now = Date.now()
  for (const [ip, record] of ipRequests) {
    if (now > record.resetAt) ipRequests.delete(ip)
  }
  // 오늘 이전 날짜 세션 기록 정리
  const today = getTodayStr()
  for (const key of ipDailySessions.keys()) {
    if (!key.endsWith(today)) ipDailySessions.delete(key)
  }
}

interface RequestBody {
  messages: { role: 'user' | 'assistant'; content: string }[]
  systemPrompt: string
}

export default async function handler(req: Request) {
  // GET: 오늘 전체 세션 수 반환 (공개 카운터)
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ count: getTodayTotalSessions(), date: getTodayStr() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // API 키 확인
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // IP 추출 (Vercel Edge 헤더 - 정확도 순서)
  const ip = req.headers.get('true-client-ip')
    || req.headers.get('cf-connecting-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || null

  // 미식별 IP 차단
  if (!ip) {
    return new Response(
      JSON.stringify({ error: '요청을 처리할 수 없습니다.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // IP 레이트 리밋 체크
  cleanupIpMap()
  if (!checkIpRate(ip)) {
    return new Response(
      JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 요청 본문 크기 제한
  const rawBody = await req.text()
  if (rawBody.length > MAX_BODY_LENGTH) {
    return new Response(
      JSON.stringify({ error: '요청이 너무 큽니다.' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let body: RequestBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response(
      JSON.stringify({ error: '잘못된 요청 형식입니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 요청 구조 검증
  if (!body.messages || !Array.isArray(body.messages) || !body.systemPrompt) {
    return new Response(
      JSON.stringify({ error: '필수 필드가 누락되었습니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // systemPrompt 길이 제한
  if (typeof body.systemPrompt !== 'string' || body.systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
    return new Response(
      JSON.stringify({ error: '시스템 프롬프트가 너무 깁니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 메시지 수 제한 (15라운드 × 2 = 30 + 여유분)
  if (body.messages.length > MAX_MESSAGES) {
    return new Response(
      JSON.stringify({ error: '대화가 너무 깁니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 각 메시지의 role/content 검증
  for (const m of body.messages) {
    if (!ALLOWED_ROLES.has(m.role) || typeof m.content !== 'string') {
      return new Response(
        JSON.stringify({ error: '잘못된 메시지 형식입니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // 일일 세션 제한 체크 (첫 메시지 = 새 세션 시작)
  // messages.length === 1: 사용자의 첫 번째 메시지 → 새 세션으로 카운트
  if (body.messages.length === 1 && !checkAndRecordSession(ip)) {
    return new Response(
      JSON.stringify({ error: '오늘의 체험 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const client = new Anthropic({ apiKey })

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: body.systemPrompt,
      messages: body.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    })

    // ReadableStream으로 변환하여 클라이언트에 전달
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    // 서버 로그에만 상세 에러 기록
    console.error('[API Error]', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ error: 'AI 응답 생성 중 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
