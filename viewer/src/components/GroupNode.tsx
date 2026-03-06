import { memo } from 'react'

interface GroupData {
  label: string
  color: string
  count: number
}

function GroupNode({ data }: { data: GroupData }) {
  return (
    <div
      className="w-full h-full rounded-2xl"
      style={{
        backgroundColor: `${data.color}08`,
        border: `1.5px solid ${data.color}22`,
      }}
    >
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-1">
        <div
          className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0"
          style={{ backgroundColor: data.color }}
        />
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: `${data.color}` }}
        >
          {data.label}
        </span>
        <span
          className="text-[10px] font-medium ml-auto px-1.5 py-0.5 rounded-md"
          style={{ backgroundColor: `${data.color}15`, color: data.color }}
        >
          {data.count}
        </span>
      </div>
    </div>
  )
}

export default memo(GroupNode)
