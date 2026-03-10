import type { MindmapNode } from './types'
import type { ChatMessage } from '../stores/useBrainstormStore'

export interface SavedSession {
  id: string
  projectName: string
  savedAt: string
  messages: ChatMessage[]
  nodes: MindmapNode[]
  round: number
  phase: 'P' | 'H' | 'V' | 'I'
  suggestions: string[]
}

const STORAGE_KEY = 'cyclist-brainstorm-sessions'
const SESSION_TTL_MS = 5 * 60 * 1000 // 5분

/** 만료된 세션을 정리하고 유효한 세션만 반환 (최신순) */
export function getSavedSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const sessions: SavedSession[] = JSON.parse(raw)
    const now = Date.now()
    const valid = sessions.filter(s => {
      const elapsed = now - new Date(s.savedAt).getTime()
      return elapsed < SESSION_TTL_MS
    })
    // 만료된 세션이 있으면 정리
    if (valid.length !== sessions.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid))
    }
    return valid.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
  } catch {
    return []
  }
}

/** 세션 저장 (새로 추가 또는 기존 덮어쓰기) */
export function saveSession(session: SavedSession): void {
  const sessions = getSavedSessions()
  const idx = sessions.findIndex(s => s.id === session.id)
  if (idx !== -1) {
    sessions[idx] = session
  } else {
    sessions.unshift(session)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

/** 세션 삭제 */
export function deleteSession(id: string): void {
  const sessions = getSavedSessions().filter(s => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

/** 세션 1개 조회 */
export function getSession(id: string): SavedSession | null {
  return getSavedSessions().find(s => s.id === id) || null
}
