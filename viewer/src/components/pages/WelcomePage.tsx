import { useProjectStore } from '../../stores/useProjectStore'
import { Link } from 'react-router'

export default function WelcomePage() {
  const projects = useProjectStore((s) => s.projects)

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <img src="/favicon.svg" alt="Cyclist" className="w-12 h-12 rounded-xl mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Cyclist
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          PHVI 사이클 기반 브레인스토밍 프로젝트를 탐색하세요.
          <br />
          사이드바에서 프로젝트를 선택하거나 아래에서 시작하세요.
        </p>

        {projects.length > 0 && (
          <div className="space-y-2">
            {projects.map((p) => (
              <Link
                key={p.slug}
                to={`/${p.slug}/mindmap`}
                className="block px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors text-left"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
