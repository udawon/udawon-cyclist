import type { NodeCategory } from '../lib/types'
import { CATEGORY_COLORS } from '../lib/types'

// 표시할 카테고리 순서
const CATEGORIES: { key: NodeCategory; label: string }[] = [
  { key: '문제정의', label: '문제정의 (P)' },
  { key: '가설', label: '가설 (H)' },
  { key: '검증', label: '검증 (V)' },
  { key: '개선', label: '개선 (I)' },
  { key: '사용자', label: '사용자' },
  { key: '위험요소', label: '위험요소' },
  { key: '경쟁사', label: '경쟁 분석' },
  { key: '기술', label: '기술 스택' },
]

interface Props {
  activeCategories: Set<NodeCategory>
  focusedCategory: NodeCategory | null
  onCategoryClick: (category: NodeCategory) => void
}

export default function CategoryNav({ activeCategories, focusedCategory, onCategoryClick }: Props) {
  const visibleCategories = CATEGORIES.filter((c) => activeCategories.has(c.key))

  return (
    <>
      {/* 데스크탑: 우측 세로 패널 */}
      <div data-export-ignore="true" className="hidden md:flex w-[154px] h-fit border-l border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            카테고리
          </span>
        </div>
        <div className="px-2 py-2 space-y-0.5">
          {visibleCategories.map(({ key, label }) => {
            const colors = CATEGORY_COLORS[key]
            const isFocused = focusedCategory === key
            return (
              <button
                key={key}
                onClick={() => onCategoryClick(key)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors
                  ${isFocused
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }
                `}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors.border }}
                />
                <span className="text-[12px] text-gray-700 dark:text-gray-300 font-medium">
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 모바일: 하단 가로 스크롤 칩 바 */}
      <div data-export-ignore="true" className="md:hidden absolute bottom-0 left-0 right-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-100 dark:border-gray-700">
        <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto scrollbar-hide">
          {visibleCategories.map(({ key, label }) => {
            const colors = CATEGORY_COLORS[key]
            const isFocused = focusedCategory === key
            return (
              <button
                key={key}
                onClick={() => onCategoryClick(key)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 transition-colors
                  ${isFocused
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : 'bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                  }
                `}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors.border }}
                />
                <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
