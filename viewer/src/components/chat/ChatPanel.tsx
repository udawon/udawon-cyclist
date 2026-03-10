import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useBrainstormStore } from '../../stores/useBrainstormStore'
import ChatMessage from './ChatMessage'
import PhaseIndicator from './PhaseIndicator'

const MULTI_SELECT_DELAY = 5 // 초
const MAX_CHIP_SELECT = 2 // 최대 선택 가능 개수

interface ChatPanelProps {
  centered?: boolean // true면 초기 중앙 집중형 레이아웃
}

export default function ChatPanel({ centered }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 복수 선택지 상태
  const [selectedChips, setSelectedChips] = useState<Set<number>>(new Set())
  const [countdown, setCountdown] = useState(0) // 남은 초
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deadlineRef = useRef<number>(0) // 전송 예정 시각(ms)

  const messages = useBrainstormStore(s => s.messages)
  const isStreaming = useBrainstormStore(s => s.isStreaming)
  const streamingContent = useBrainstormStore(s => s.streamingContent)
  const round = useBrainstormStore(s => s.round)
  const phase = useBrainstormStore(s => s.phase)
  const suggestions = useBrainstormStore(s => s.suggestions)
  const isCompleted = useBrainstormStore(s => s.isCompleted)
  const sendMessage = useBrainstormStore(s => s.sendMessage)

  // 타이머 정리 헬퍼
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    deadlineRef.current = 0
    setCountdown(0)
  }, [])

  // 선택된 칩들을 합쳐서 전송
  const submitSelectedChips = useCallback(() => {
    const selected = Array.from(selectedChips)
      .sort((a, b) => a - b)
      .map(i => suggestions[i])
      .filter(Boolean)
    if (selected.length === 0) return
    clearTimer()
    setSelectedChips(new Set())
    // 복수 선택 시 줄바꿈으로 구분하여 전송
    sendMessage(selected.join('\n'))
  }, [selectedChips, suggestions, sendMessage, clearTimer])

  // 칩 클릭 핸들러: 토글 + 타이머 리셋
  const handleChipClick = useCallback((index: number) => {
    setSelectedChips(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        // 최대 선택 개수 제한
        if (next.size >= MAX_CHIP_SELECT) return prev
        next.add(index)
      }
      // 모두 해제되면 타이머 취소
      if (next.size === 0) {
        clearTimer()
        return next
      }
      // 타이머 (재)시작: 마지막 클릭 후 5초
      deadlineRef.current = Date.now() + MULTI_SELECT_DELAY * 1000
      setCountdown(MULTI_SELECT_DELAY)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        const remaining = Math.ceil((deadlineRef.current - Date.now()) / 1000)
        if (remaining <= 0) {
          // 시간 만료 → 다음 틱에서 전송 (state 업데이트 후)
          clearInterval(timerRef.current!)
          timerRef.current = null
          setCountdown(0)
          // submitSelectedChips를 직접 호출할 수 없으므로 플래그 사용
          deadlineRef.current = -1 // 전송 신호
        } else {
          setCountdown(remaining)
        }
      }, 200)
      return next
    })
  }, [clearTimer])

  // 전송 신호 감지 (deadlineRef === -1)
  useEffect(() => {
    if (countdown === 0 && deadlineRef.current === -1 && selectedChips.size > 0) {
      submitSelectedChips()
    }
  }, [countdown, selectedChips, submitSelectedChips])

  // suggestions 바뀌면 선택 초기화
  useEffect(() => {
    setSelectedChips(new Set())
    clearTimer()
  }, [suggestions, clearTimer])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => { clearTimer() }
  }, [clearTimer])

  // 메시지 추가/스트리밍 시 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  // 초기 포커스
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    // 직접 입력 시 선택 상태 초기화
    clearTimer()
    setSelectedChips(new Set())
    sendMessage(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 초기 중앙 집중형: 입력창만 표시
  if (centered) {
    return (
      <div className="flex flex-col gap-3">
        <PhaseIndicator currentPhase={phase} round={round} />
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="프로젝트 이름이나 한 줄 설명을 입력하세요..."
            disabled={isStreaming}
            rows={2}
            className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50 max-h-32"
            onInput={e => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isStreaming || !input.trim()}
            className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // State 2: 대화 진행형
  return (
    <div className="h-full flex flex-col">
      {/* PHVI 단계 표시 */}
      <PhaseIndicator currentPhase={phase} round={round} />

      {/* 메시지 목록 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* 스트리밍 중 표시 */}
        {isStreaming && streamingContent && (
          <div className="flex justify-start mb-3">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {streamingContent}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* 스트리밍 중이나 아직 텍스트 없을 때 */}
        {isStreaming && !streamingContent && (
          <div className="flex justify-start mb-3">
            <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-gray-100 dark:bg-gray-800">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 선택지 칩 (복수 선택 + 카운트다운) */}
      {suggestions.length > 0 && !isStreaming && (
        <div className="shrink-0 px-4 py-2 border-t border-gray-100 dark:border-gray-800/50">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              최대 2개를 선택할 수 있어요. 선택 후 {MULTI_SELECT_DELAY}초 뒤 자동 전송됩니다. <span className="text-indigo-500 dark:text-indigo-400 font-medium">더 많은 아이디어가 있다면 직접 입력해주세요!</span>
            </p>
            {/* 카운트다운 + 즉시 전송 버튼 */}
            {selectedChips.size > 0 && (
              <div className="flex items-center gap-1.5">
                {/* 원형 카운트다운 */}
                <div className="relative w-5 h-5">
                  <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="2" />
                    <circle
                      cx="10" cy="10" r="8" fill="none" stroke="currentColor"
                      className="text-indigo-500 transition-all duration-200"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 8}`}
                      strokeDashoffset={`${2 * Math.PI * 8 * (1 - countdown / MULTI_SELECT_DELAY)}`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-indigo-600 dark:text-indigo-400">
                    {countdown}
                  </span>
                </div>
                <button
                  onClick={submitSelectedChips}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  바로 전송
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => {
              const isSelected = selectedChips.has(i)
              return (
                <button
                  key={i}
                  onClick={() => handleChipClick(i)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-500/25 scale-[1.02]'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
                  }`}
                >
                  {isSelected && (
                    <svg className="inline w-3 h-3 mr-1 -ml-0.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                    </svg>
                  )}
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 입력 폼 */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 relative">
        {/* 완료 오버레이 */}
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-[2px] z-10 rounded-b-xl">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              브레인스토밍 완료
            </span>
          </div>
        )}
        {/* 스트리밍 중 오버레이 */}
        {isStreaming && !isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-[2px] z-10 rounded-b-xl">
            <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
              생각을 확장 중입니다 · · ·
            </span>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            disabled={isStreaming || isCompleted}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50 max-h-32"
            onInput={e => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isStreaming || isCompleted || !input.trim()}
            className="shrink-0 w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
