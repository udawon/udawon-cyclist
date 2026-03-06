import { useState, useEffect } from 'react'
import type { MindmapData } from '../lib/types'

const PLACEHOLDER: MindmapData = {
  projectName: '예시 프로젝트',
  createdAt: new Date().toISOString(),
  nodes: [
    { id: 'n1', label: '핵심 문제', description: '/brainstorm 스킬을 실행하면 여기에 실제 데이터가 표시됩니다.', category: '핵심문제', parentId: null },
    { id: 'n2', label: '해결책 A', description: 'Claude Code에서 /brainstorm을 입력해 시작하세요.', category: '해결책', parentId: 'n1' },
    { id: 'n3', label: '해결책 B', description: '브레인스토밍 완료 후 이 뷰어를 새로고침하면 결과가 나타납니다.', category: '해결책', parentId: 'n1' },
    { id: 'n4', label: '타깃 사용자', description: '사용자 페르소나 예시입니다.', category: '사용자', parentId: null },
    { id: 'n5', label: '리스크', description: '위험 요소 예시입니다.', category: '위험요소', parentId: null },
  ],
}

export function useMindmapData(slug?: string) {
  const [data, setData] = useState<MindmapData | null>(null)
  const [isPlaceholder, setIsPlaceholder] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    setIsPlaceholder(false)
    setError(null)

    const url = slug ? `/projects/${slug}/mindmap.json` : '/mindmap.json'

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then((json: MindmapData) => {
        setData(json)
        setIsPlaceholder(false)
      })
      .catch(() => {
        setData(PLACEHOLDER)
        setIsPlaceholder(true)
        setError(null)
      })
  }, [slug])

  return { data, isPlaceholder, error }
}
