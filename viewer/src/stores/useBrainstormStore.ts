import { create } from 'zustand'
import type { MindmapNode } from '../lib/types'
import { parseAssistantResponse } from '../lib/parseNodes'
import { buildSystemPrompt } from '../lib/brainstormPrompt'
import { saveSession, type SavedSession } from '../lib/brainstormStorage'
import { canStartSession, recordSessionStart, getDailySessionInfo } from '../lib/rateLimiter'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface BrainstormState {
  // 대화 상태
  messages: ChatMessage[]
  isStreaming: boolean
  streamingContent: string

  // 마인드맵 상태
  nodes: MindmapNode[]
  projectName: string

  // PHVI 메타데이터
  round: number
  phase: 'P' | 'H' | 'V' | 'I'

  // 사고 확장 선택지
  suggestions: string[]

  // 완료 여부
  isCompleted: boolean
  completedAt: number | null

  // 세션 ID (저장/복원용)
  sessionId: string

  // 액션
  sendMessage: (content: string) => Promise<void>
  save: () => void
  load: (session: SavedSession) => void
  reset: () => void
}

const MAX_ROUNDS = 15

/** 선택지 파싱 실패 시 단계별 기본 선택지 */
function getDefaultSuggestions(phase: 'P' | 'H' | 'V' | 'I'): string[] {
  const defaults: Record<string, string[]> = {
    P: ['가장 큰 불편함이 뭔가요?', '이 문제를 겪는 사람은?', '문제가 해결 안 되면?', '비슷한 경험이 있나요?'],
    H: ['이 문제를 기술로 해결한다면?', '기존 방식을 개선한다면?', '완전히 새로운 접근이라면?', '가장 간단한 해결책은?'],
    V: ['프로토타입으로 테스트', '사용자 인터뷰로 검증', '데이터로 확인하는 방법', '최소 비용으로 검증하려면?'],
    I: ['핵심 기능에 집중하기', '타깃을 바꿔볼까요?', '우선순위를 재조정', '다른 가설로 피벗'],
  }
  return defaults[phase] || defaults.P
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init',
  role: 'assistant',
  content: '어떤 프로젝트를 구상하고 계신가요? 프로젝트 이름이나 한 줄 설명을 알려주세요.',
  timestamp: Date.now(),
}

const store = create<BrainstormState>((set, get) => ({
  messages: [INITIAL_MESSAGE],
  isStreaming: false,
  streamingContent: '',
  nodes: [],
  projectName: '',
  round: 0,
  phase: 'P',
  suggestions: [],
  isCompleted: false,
  completedAt: null,
  sessionId: `bs-${Date.now()}`,

  sendMessage: async (content: string) => {
    const state = get()
    if (state.isStreaming || state.isCompleted) return

    // 첫 메시지(세션 시작) 시 일일 제한 체크
    if (state.round === 0) {
      if (!canStartSession()) {
        const limitMsg: ChatMessage = {
          id: `limit-${Date.now()}`,
          role: 'assistant',
          content: '오늘의 브레인스토밍 횟수(2회)를 모두 사용했습니다. 내일 다시 시도해주세요!',
          timestamp: Date.now(),
        }
        set(s => ({ messages: [...s.messages, limitMsg], isCompleted: true, suggestions: [] }))
        return
      }
      recordSessionStart()
    }

    // 사용자 메시지 추가
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    set({ messages: [...state.messages, userMsg], isStreaming: true, streamingContent: '' })

    // 첫 메시지에서 프로젝트명 추출
    if (state.round === 0 && !state.projectName) {
      set({ projectName: content.slice(0, 30) })
    }

    // API 호출용 메시지 구성 (초기 메시지 제외)
    const apiMessages = [...state.messages, userMsg]
      .filter(m => m.id !== 'init')
      .map(m => ({ role: m.role, content: m.content }))

    const systemPrompt = buildSystemPrompt(get().nodes, get().round)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, systemPrompt }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: '요청에 실패했습니다.' }))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      // 스트리밍 읽기
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk

        // 마커 이전 텍스트만 화면에 표시
        const sugIdx = fullText.indexOf('---SUGGESTIONS---')
        const nodeIdx = fullText.indexOf('---NODES---')
        const cutIdx = sugIdx !== -1 ? sugIdx : (nodeIdx !== -1 ? nodeIdx : -1)
        const displayText = cutIdx !== -1 ? fullText.substring(0, cutIdx) : fullText
        set({ streamingContent: displayText })
      }

      // 스트리밍 완료 → 파싱
      const parsed = parseAssistantResponse(fullText)

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: parsed.text,
        timestamp: Date.now(),
      }

      const currentState = get()
      const updatedNodes = [...currentState.nodes, ...parsed.nodes]

      // 선택지가 비어있으면 단계별 기본 선택지 제공
      const finalSuggestions = parsed.suggestions.length > 0
        ? parsed.suggestions
        : getDefaultSuggestions(parsed.phase)

      const newRound = currentState.round + 1
      const completed = newRound >= MAX_ROUNDS

      // 완료 시 완료 메시지를 함께 추가
      const completionMsg: ChatMessage | null = completed
        ? {
            id: `end-${Date.now()}`,
            role: 'assistant',
            content: '브레인스토밍이 완료되었습니다! 🎉\n\n마인드맵을 확인하고, 필요하다면 **세션 저장** 또는 **PDF 내보내기**를 해주세요.\n\n⚠️ **5분 후 세션이 자동 삭제됩니다.** 저장하지 않으면 결과가 사라집니다!',
            timestamp: Date.now(),
          }
        : null

      set({
        messages: completionMsg
          ? [...currentState.messages, assistantMsg, completionMsg]
          : [...currentState.messages, assistantMsg],
        isStreaming: false,
        streamingContent: '',
        nodes: updatedNodes,
        round: newRound,
        phase: parsed.phase,
        suggestions: completed ? [] : finalSuggestions,
        isCompleted: completed,
        completedAt: completed ? Date.now() : null,
      })
    } catch (err) {
      // 에러 시 에러 메시지를 assistant 메시지로 추가
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
        timestamp: Date.now(),
      }

      set(s => ({
        messages: [...s.messages, errorMsg],
        isStreaming: false,
        streamingContent: '',
      }))
    }
  },

  save: () => {
    const s = get()
    saveSession({
      id: s.sessionId,
      projectName: s.projectName,
      savedAt: new Date().toISOString(),
      messages: s.messages,
      nodes: s.nodes,
      round: s.round,
      phase: s.phase,
      suggestions: s.suggestions,
    })
  },

  load: (session: SavedSession) => set({
    sessionId: session.id,
    messages: session.messages,
    isStreaming: false,
    streamingContent: '',
    nodes: session.nodes,
    projectName: session.projectName,
    round: session.round,
    phase: session.phase,
    suggestions: session.suggestions,
    isCompleted: session.round >= MAX_ROUNDS,
  }),

  reset: () => set({
    messages: [{ ...INITIAL_MESSAGE, timestamp: Date.now() }],
    isStreaming: false,
    streamingContent: '',
    nodes: [],
    projectName: '',
    round: 0,
    phase: 'P',
    suggestions: [],
    isCompleted: false,
    completedAt: null,
    sessionId: `bs-${Date.now()}`,
  }),
}))

if (import.meta.env.DEV) (window as Record<string, unknown>).__BRAINSTORM_STORE__ = store
export const useBrainstormStore = store
