import { useParams } from 'react-router'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useMarkdown } from '../../hooks/useMarkdown'

interface Props {
  doc: string
}

export default function MarkdownPage({ doc }: Props) {
  const { slug } = useParams()
  const { content, isLoading, error } = useMarkdown(slug, doc)

  if (isLoading || content === null) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">문서 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <article className="max-w-3xl mx-auto px-6 py-8 prose prose-sm dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700">
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </article>
    </div>
  )
}
