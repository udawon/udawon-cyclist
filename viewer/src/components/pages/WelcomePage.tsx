import { useState, useRef, useEffect, useCallback } from 'react'
import { Bike } from 'lucide-react'
import { ReactFlowProvider } from '@xyflow/react'
import { useBrainstormStore } from '../../stores/useBrainstormStore'
import type { MindmapData } from '../../lib/types'
import { exportMindmapToPdf } from '../../lib/exportPdf'
import { getDailySessionInfo } from '../../lib/rateLimiter'
import MindmapCanvas from '../MindmapCanvas'
import ChatPanel from '../chat/ChatPanel'

const SESSION_TTL_MS = 5 * 60 * 1000 // 5분

function useTodaySessionCount() {
  const [count, setCount] = useState<number | null>(null)

  const fetch_ = useCallback(() => {
    fetch('/api/chat')
      .then(r => r.json())
      .then((data: { count: number }) => setCount(data.count))
      .catch(() => {/* 실패 시 무시 */})
  }, [])

  useEffect(() => {
    fetch_()
  }, [fetch_])

  return { count, refetch: fetch_ }
}

export default function WelcomePage() {
  const nodes = useBrainstormStore(s => s.nodes)
  const projectName = useBrainstormStore(s => s.projectName)
  const reset = useBrainstormStore(s => s.reset)
  const save = useBrainstormStore(s => s.save)
  const isCompleted = useBrainstormStore(s => s.isCompleted)
  const completedAt = useBrainstormStore(s => s.completedAt)

  // 모바일 탭 전환
  const [mobileTab, setMobileTab] = useState<'chat' | 'map'>('chat')
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const mindmapRef = useRef<HTMLDivElement>(null)

  // 완료 후 카운트다운 (초)
  const [remainingSec, setRemainingSec] = useState<number | null>(null)

  useEffect(() => {
    if (!isCompleted || !completedAt) {
      setRemainingSec(null)
      return
    }
    const tick = () => {
      const elapsed = Date.now() - completedAt
      const left = Math.max(0, Math.ceil((SESSION_TTL_MS - elapsed) / 1000))
      setRemainingSec(left)
      if (left <= 0) {
        reset()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isCompleted, completedAt, reset])

  const mindmapData: MindmapData = {
    projectName: projectName || '브레인스토밍',
    createdAt: new Date().toISOString(),
    nodes,
  }

  // 세션 저장
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (saved || saving) return
    setSaving(true)
    save()
    // 저장 완료 후 상태 전환
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    setSaved(true)
  }

  // PDF 내보내기
  const handleExportPdf = async () => {
    if (!mindmapRef.current) return
    setExporting(true)
    try {
      await exportMindmapToPdf(mindmapRef.current, `mindmap-${projectName || 'brainstorm'}`)
    } finally {
      setExporting(false)
    }
  }

  const { count: todayCount } = useTodaySessionCount()

  const messages = useBrainstormStore(s => s.messages)
  const hasNodes = nodes.length > 0
  // 초기 메시지(1개) 외에 대화가 시작되면 State 2로 전환
  const hasConversation = messages.length > 1

  // State 1: 초기 — 중앙 집중형
  if (!hasConversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        {/* 브랜딩 + 이용 안내 */}
        <div className="mb-8 text-center">
          <Bike className="w-10 h-10 mb-3 mx-auto text-orange-500 animate-[ride_2s_ease-in-out_infinite]" strokeWidth={1.5} />
          <style>{`
            @keyframes ride {
              0%, 100% { transform: translateX(-4px) rotate(-2deg); }
              50% { transform: translateX(4px) rotate(2deg); }
            }
          `}</style>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Cyclist 체험하기
          </h2>
          {todayCount !== null && (
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 font-medium">
              오늘 완주 횟수 : {todayCount}회
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            프로젝트 아이디어를 함께 구조화하세요
          </p>
          <div className="inline-flex flex-col gap-1.5 text-left text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-5 py-4 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-px text-indigo-400">&#8226;</span>
              <span>AI가 질문하고, 답변하면 마인드맵이 자동 생성됩니다</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-px text-indigo-400">&#8226;</span>
              <span>최대 <strong className="text-gray-600 dark:text-gray-300">15회</strong> 질의응답이 가능합니다</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-px text-indigo-400">&#8226;</span>
              <span>제안된 선택지는 최대 <strong className="text-gray-600 dark:text-gray-300">2개</strong>까지 복수 선택 가능합니다</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-px text-indigo-400">&#8226;</span>
              <span>선택지 외에 <strong className="text-gray-600 dark:text-gray-300">직접 입력</strong>하면 더 풍부한 결과를 얻을 수 있습니다</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-px text-indigo-400">&#8226;</span>
              <span>문제정의 → 가설 → 검증 → 개선 순서로 사고가 확장됩니다</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-px text-indigo-400">&#8226;</span>
              <span>체험판에서는 <strong className="text-gray-600 dark:text-gray-300">SPEC · PRD · TASKS</strong> 문서가 제공되지 않습니다</span>
            </div>
          </div>
          {(() => {
            const { used, max } = getDailySessionInfo()
            const remaining = max - used
            return (
              <p className={`text-[11px] mt-3 ${remaining > 0 ? 'text-gray-400 dark:text-gray-500' : 'text-red-500 dark:text-red-400 font-medium'}`}>
                {remaining > 0
                  ? `오늘 남은 브레인스토밍: ${remaining}/${max}회`
                  : `오늘의 브레인스토밍 횟수를 모두 사용했습니다`
                }
              </p>
            )
          })()}
        </div>

        {/* 중앙 채팅 — max-w-640 */}
        <div className="w-full max-w-[640px]">
          <ChatPanel centered />
        </div>
      </div>
    )
  }

  // State 2: 대화 중 — 마인드맵(35%) 위 + 채팅(65%) 아래
  return (
    <div className="h-full flex flex-col">
      {/* 완료 카운트다운 배너 */}
      {isCompleted && remainingSec !== null && (
        <div className={`shrink-0 flex items-center justify-center gap-3 px-4 py-2 text-xs font-medium transition-colors ${
          remainingSec <= 60
            ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-b border-red-200 dark:border-red-800'
            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-b border-amber-200 dark:border-amber-800'
        }`}>
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>
            {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, '0')} 후 자동 삭제
          </span>
          <button
            onClick={handleSave}
            disabled={saved || saving}
            className={`px-2.5 py-0.5 rounded-full transition-all ${
              saved
                ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                : saving
                  ? 'bg-gray-400 text-white cursor-wait'
                  : remainingSec <= 60
                    ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                    : 'bg-amber-600 text-white hover:bg-amber-700 animate-pulse'
            }`}
          >
            {saved ? '저장됨 ✓' : saving ? '저장중...' : '세션 저장'}
          </button>
        </div>
      )}

      {/* 액션 바 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
          {projectName}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="text-[11px] px-2 py-0.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            새 세션
          </button>
          {hasNodes && (
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="text-[11px] px-2 py-0.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {exporting ? '내보내는 중...' : 'PDF'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saved || saving}
            className={`text-[11px] px-2 py-0.5 rounded-md transition-all ${
              saved
                ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                : saving
                  ? 'text-gray-400 cursor-wait'
                  : isCompleted
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 animate-pulse'
                    : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
            }`}
          >
            {saved ? '저장됨 ✓' : saving ? '저장중...' : '세션 저장'}
          </button>
        </div>
      </div>

      {/* 모바일 탭 바 */}
      <div className="md:hidden flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            mobileTab === 'map'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          마인드맵
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2 text-xs font-medium transition-colors relative ${
            mobileTab === 'chat'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          채팅
        </button>
      </div>

      {/* 데스크탑: 마인드맵(35%) 위 + 채팅(65%) 아래 세로 분할 */}
      {/* 모바일: 탭 전환 */}
      <div className="flex-1 flex flex-col md:flex-col overflow-hidden">
        {/* 마인드맵 (상단 35%) */}
        <div
          ref={mindmapRef}
          className={`${
            mobileTab === 'map' ? 'flex' : 'hidden'
          } md:flex h-full md:h-[35%] md:shrink-0 border-b border-gray-200 dark:border-gray-800 flex-col`}
        >
          {hasNodes ? (
            <ReactFlowProvider>
              <MindmapCanvas data={mindmapData} isPlaceholder={false} autoFit />
            </ReactFlowProvider>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600">
              <div className="text-center">
                <div className="text-2xl mb-2 opacity-40">🧠</div>
                <p className="text-xs">대화를 이어가면 마인드맵이 생성됩니다</p>
              </div>
            </div>
          )}
        </div>

        {/* 채팅 (하단 65%) */}
        <div className={`${
          mobileTab === 'chat' ? 'flex' : 'hidden'
        } md:flex h-full md:h-[65%] flex-col`}>
          <ChatPanel />
        </div>
      </div>
    </div>
  )
}
