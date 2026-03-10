import { memo } from 'react'

interface Props {
  currentPhase: 'P' | 'H' | 'V' | 'I'
  round: number
}

const PHASES = [
  { key: 'P' as const, label: '문제정의', color: 'text-red-500', bg: 'bg-red-500' },
  { key: 'H' as const, label: '가설', color: 'text-blue-500', bg: 'bg-blue-500' },
  { key: 'V' as const, label: '검증', color: 'text-amber-500', bg: 'bg-amber-500' },
  { key: 'I' as const, label: '개선', color: 'text-green-500', bg: 'bg-green-500' },
]

const PHASE_ORDER = { P: 0, H: 1, V: 2, I: 3 }

export default memo(function PhaseIndicator({ currentPhase, round }: Props) {
  const currentIdx = PHASE_ORDER[currentPhase]

  return (
    <div className="flex items-center gap-1 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      {PHASES.map((phase, idx) => {
        const isActive = idx === currentIdx
        const isPast = idx < currentIdx

        return (
          <div key={phase.key} className="flex items-center">
            {/* 단계 칩 */}
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                isActive
                  ? `${phase.bg} text-white font-semibold`
                  : isPast
                    ? `${phase.color} font-medium opacity-60`
                    : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {isPast && <span>&#10003;</span>}
              <span>{phase.label}</span>
            </div>

            {/* 화살표 */}
            {idx < PHASES.length - 1 && (
              <span className="mx-0.5 text-gray-300 dark:text-gray-700 text-xs">&rarr;</span>
            )}
          </div>
        )
      })}

      {/* 라운드 표시 */}
      <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-600 tabular-nums">
        {round}/15
      </span>
    </div>
  )
})
