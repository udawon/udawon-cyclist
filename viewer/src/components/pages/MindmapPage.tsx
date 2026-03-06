import { useParams } from 'react-router'
import { ReactFlowProvider } from '@xyflow/react'
import { useMindmapData } from '../../hooks/useMindmapData'
import MindmapCanvas from '../MindmapCanvas'

export default function MindmapPage() {
  const { slug } = useParams()
  const { data, isPlaceholder } = useMindmapData(slug)

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <MindmapCanvas data={data} isPlaceholder={isPlaceholder} />
    </ReactFlowProvider>
  )
}
