import type { MindmapNode, NodeCategory } from './types'

interface ParsedResponse {
  /** 대화 텍스트 (노드/선택지 블록 제거됨) */
  text: string
  /** 이번 턴에서 추출된 노드들 */
  nodes: MindmapNode[]
  /** 사고 확장 선택지 */
  suggestions: string[]
  /** 현재 라운드 */
  round: number
  /** 현재 PHVI 단계 */
  phase: 'P' | 'H' | 'V' | 'I'
}

const VALID_CATEGORIES: Set<string> = new Set([
  '문제정의', '가설', '검증', '개선',
  '사용자', '경쟁사', '위험요소', '기술', '기타',
  '핵심문제', '해결책',
])

/**
 * Claude 응답에서 대화 텍스트와 노드 데이터를 분리한다.
 * ---NODES--- ~ ---ENDNODES--- 마커 기반 파싱.
 */
export function parseAssistantResponse(raw: string): ParsedResponse {
  const nodesStart = '---NODES---'
  const nodesEnd = '---ENDNODES---'
  const sugStart = '---SUGGESTIONS---'
  const sugEnd = '---ENDSUGGESTIONS---'

  // 선택지 파싱
  let suggestions: string[] = []
  let textWithoutSuggestions = raw
  const sugStartIdx = raw.indexOf(sugStart)
  const sugEndIdx = raw.indexOf(sugEnd)
  if (sugStartIdx !== -1 && sugEndIdx !== -1) {
    const sugJson = raw.substring(sugStartIdx + sugStart.length, sugEndIdx).trim()
    try {
      const parsed = JSON.parse(sugJson)
      if (Array.isArray(parsed)) {
        suggestions = parsed.filter((s): s is string => typeof s === 'string')
      }
    } catch { /* 선택지 파싱 실패 → 무시 */ }
    // 텍스트에서 선택지 블록 제거
    textWithoutSuggestions = raw.substring(0, sugStartIdx) + raw.substring(sugEndIdx + sugEnd.length)
  }

  // 노드 파싱
  const startIdx = textWithoutSuggestions.indexOf(nodesStart)
  const endIdx = textWithoutSuggestions.indexOf(nodesEnd)

  // 마커가 없으면 텍스트만 반환
  if (startIdx === -1 || endIdx === -1) {
    return { text: textWithoutSuggestions.trim(), nodes: [], suggestions, round: 0, phase: 'P' }
  }

  const text = textWithoutSuggestions.substring(0, startIdx).trim()
  const jsonStr = textWithoutSuggestions.substring(startIdx + nodesStart.length, endIdx).trim()

  try {
    const parsed = JSON.parse(jsonStr)
    const nodes: MindmapNode[] = (parsed.nodes || [])
      .filter((n: Record<string, unknown>) =>
        n.id && n.label && n.category && VALID_CATEGORIES.has(n.category as string)
      )
      .map((n: Record<string, unknown>) => ({
        id: n.id as string,
        label: n.label as string,
        description: (n.description as string) || '',
        category: n.category as NodeCategory,
        parentId: (n.parentId as string) || null,
      }))

    return {
      text,
      nodes,
      suggestions,
      round: (parsed.round as number) || 0,
      phase: (['P', 'H', 'V', 'I'].includes(parsed.phase as string)
        ? parsed.phase as 'P' | 'H' | 'V' | 'I'
        : 'P'),
    }
  } catch {
    return { text: textWithoutSuggestions.trim(), nodes: [], suggestions, round: 0, phase: 'P' }
  }
}
