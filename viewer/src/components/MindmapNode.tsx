import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { MindmapNode as MindmapNodeType } from '../lib/types'
import { CATEGORY_COLORS } from '../lib/types'

interface MindmapNodeData extends MindmapNodeType {
  _isSelected?: boolean
}

interface Props {
  data: MindmapNodeData
}

function MindmapNode({ data }: Props) {
  const selected = data._isSelected ?? false
  const colors = CATEGORY_COLORS[data.category] ?? CATEGORY_COLORS['기타']

  return (
    <div
      className={`w-[200px] h-[76px] rounded-lg bg-white dark:bg-gray-800 cursor-pointer overflow-hidden flex transition-all duration-200 ${
        selected ? 'ring-selected' : ''
      }`}
      style={{
        boxShadow: selected
          ? `0 0 0 2px ${colors.border}4D, 0 2px 8px ${colors.border}20`
          : '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !w-3 !h-1 !border-0 !min-h-0 !-top-[2px]" />
      <Handle type="target" position={Position.Left} id="left-target" className="!bg-transparent !w-1 !h-3 !border-0 !min-w-0 !-left-[2px]" />

      {/* 카테고리 색상 띠 */}
      <div
        className="w-1 flex-shrink-0 rounded-l-lg"
        style={{ backgroundColor: colors.border }}
      />

      <div className="px-3 py-3 flex-1 min-w-0">
        <p className="text-gray-900 dark:text-gray-100 font-semibold text-xs leading-snug mb-1.5 line-clamp-1">
          {data.label}
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-[10px] leading-snug line-clamp-2">
          {data.description}
        </p>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-transparent !w-3 !h-1 !border-0 !min-h-0 !-bottom-[2px]" />
      <Handle type="source" position={Position.Right} id="right-source" className="!bg-transparent !w-1 !h-3 !border-0 !min-w-0 !-right-[2px]" />
    </div>
  )
}

export default memo(MindmapNode)
