import { useState, useEffect } from 'react'

export function useMarkdown(slug?: string, doc?: string) {
  const [content, setContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug || !doc) return

    setContent(null)
    setIsLoading(true)
    setError(null)

    fetch(`/projects/${slug}/${doc}.md`)
      .then((res) => {
        if (!res.ok) throw new Error('문서를 찾을 수 없습니다')
        return res.text()
      })
      .then((text) => {
        setContent(text)
        setIsLoading(false)
      })
      .catch((err) => {
        setError((err as Error).message)
        setIsLoading(false)
      })
  }, [slug, doc])

  return { content, isLoading, error }
}
