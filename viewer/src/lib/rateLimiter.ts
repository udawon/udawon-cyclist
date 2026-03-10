/**
 * 클라이언트 사이드 일일 세션 제한 (계층 1)
 * localStorage 기반 - 정직한 사용자의 과도 사용 방지
 */

const DAILY_LIMIT_KEY = 'cyclist-daily-sessions'
const MAX_SESSIONS_PER_DAY = 2

interface DailyRecord {
  date: string // YYYY-MM-DD
  count: number
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function getRecord(): DailyRecord {
  try {
    const raw = localStorage.getItem(DAILY_LIMIT_KEY)
    if (!raw) return { date: getTodayStr(), count: 0 }
    const record: DailyRecord = JSON.parse(raw)
    // 날짜가 바뀌었으면 리셋
    if (record.date !== getTodayStr()) {
      return { date: getTodayStr(), count: 0 }
    }
    return record
  } catch {
    return { date: getTodayStr(), count: 0 }
  }
}

/** 새 세션 시작 가능 여부 */
export function canStartSession(): boolean {
  return getRecord().count < MAX_SESSIONS_PER_DAY
}

/** 세션 시작 기록 (첫 메시지 전송 시 호출) */
export function recordSessionStart(): void {
  const record = getRecord()
  record.count += 1
  localStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify(record))
}

/** 현재 일일 세션 정보 (UI 표시용) */
export function getDailySessionInfo(): { used: number; max: number } {
  return { used: getRecord().count, max: MAX_SESSIONS_PER_DAY }
}
