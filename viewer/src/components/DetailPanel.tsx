import type { MindmapNode, MindmapData } from '../lib/types'
import { CATEGORY_COLORS } from '../lib/types'

interface Props {
  node: MindmapNode | null
  data: MindmapData
  onClose: () => void
  onNavigate: (node: MindmapNode) => void
}

function RelationChip({ node, onClick }: { node: MindmapNode; onClick: () => void }) {
  const colors = CATEGORY_COLORS[node.category] ?? CATEGORY_COLORS['기타']
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600"
    >
      <div
        className="w-[6px] h-[6px] rounded-full flex-shrink-0"
        style={{ backgroundColor: colors.border }}
      />
      <span className="text-gray-700 dark:text-gray-300 text-[12px] leading-snug truncate">{node.label}</span>
    </button>
  )
}

export default function DetailPanel({ node, data, onClose, onNavigate }: Props) {
  if (!node) return null

  const colors = CATEGORY_COLORS[node.category] ?? CATEGORY_COLORS['기타']
  const parent = node.parentId ? data.nodes.find((n) => n.id === node.parentId) ?? null : null
  const children = data.nodes.filter((n) => n.parentId === node.id)

  return (
    <>
      {/* 모바일 오버레이 */}
      <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={onClose} />
    <div className="fixed right-0 top-0 bottom-0 z-40 md:static w-80 h-full border-l border-gray-100 dark:border-gray-700 flex flex-col flex-shrink-0 bg-white dark:bg-gray-900">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: colors.border }}
          />
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {node.category}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <h2 className="text-gray-900 dark:text-gray-100 font-bold text-[15px] leading-snug">{node.label}</h2>

        <div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-2">설명</p>
          <p className="text-gray-600 dark:text-gray-300 text-[13px] leading-relaxed">{node.description}</p>
        </div>

        {parent && (
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-2">상위 노드</p>
            <RelationChip node={parent} onClick={() => onNavigate(parent)} />
          </div>
        )}

        {children.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-2">
              하위 노드 ({children.length})
            </p>
            <div className="space-y-1.5">
              {children.map((c) => (
                <RelationChip key={c.id} node={c} onClick={() => onNavigate(c)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
