export interface Project {
  slug: string
  name: string
  description: string
  createdAt: string
  docs: string[]
}

export type NodeCategory =
  | '문제정의'
  | '가설'
  | '검증'
  | '개선'
  | '사용자'
  | '경쟁사'
  | '위험요소'
  | '기술'
  | '기타'
  // 하위 호환 (기존 데이터 지원)
  | '핵심문제'
  | '해결책'

export interface MindmapNode {
  id: string
  label: string
  description: string
  category: NodeCategory
  parentId: string | null
}

export interface MindmapData {
  projectName: string
  createdAt: string
  nodes: MindmapNode[]
}

export const CATEGORY_COLORS: Record<NodeCategory, { border: string; badge: string; dot: string }> = {
  // PHVI 사이클 카테고리
  문제정의: { border: '#ef4444', badge: 'bg-red-500/20 text-red-300', dot: 'bg-red-500' },
  가설: { border: '#3b82f6', badge: 'bg-blue-500/20 text-blue-300', dot: 'bg-blue-500' },
  검증: { border: '#f59e0b', badge: 'bg-amber-500/20 text-amber-300', dot: 'bg-amber-500' },
  개선: { border: '#22c55e', badge: 'bg-green-500/20 text-green-300', dot: 'bg-green-500' },
  // 보조 카테고리
  사용자: { border: '#a855f7', badge: 'bg-purple-500/20 text-purple-300', dot: 'bg-purple-500' },
  경쟁사: { border: '#f97316', badge: 'bg-orange-500/20 text-orange-300', dot: 'bg-orange-500' },
  위험요소: { border: '#ec4899', badge: 'bg-pink-500/20 text-pink-300', dot: 'bg-pink-500' },
  기술: { border: '#6b7280', badge: 'bg-gray-500/20 text-gray-300', dot: 'bg-gray-500' },
  기타: { border: '#64748b', badge: 'bg-slate-500/20 text-slate-300', dot: 'bg-slate-500' },
  // 하위 호환
  핵심문제: { border: '#ef4444', badge: 'bg-red-500/20 text-red-300', dot: 'bg-red-500' },
  해결책: { border: '#3b82f6', badge: 'bg-blue-500/20 text-blue-300', dot: 'bg-blue-500' },
}
