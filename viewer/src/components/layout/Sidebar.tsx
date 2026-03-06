import { NavLink, useParams } from 'react-router'
import { useProjectStore } from '../../stores/useProjectStore'

interface Props {
  open: boolean
  onClose: () => void
}

const docTabs = [
  { key: 'mindmap', label: 'Mindmap' },
  { key: 'spec', label: 'SPEC' },
  { key: 'prd', label: 'PRD' },
  { key: 'tasks', label: 'TASKS' },
]

export default function Sidebar({ open, onClose }: Props) {
  const { projects, isLoading } = useProjectStore()
  const { slug } = useParams()

  return (
    <>
      {/* 모바일 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-12 left-0 bottom-0 z-40 w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-200
          lg:static lg:translate-x-0 lg:z-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-3 overflow-y-auto h-full">
          {/* 프로젝트 목록 */}
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">
            프로젝트
          </p>

          {isLoading && (
            <div className="px-2 py-4 text-center">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          <div className="space-y-1">
            {projects.map((project) => (
              <div key={project.slug}>
                <NavLink
                  to={`/${project.slug}/mindmap`}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `block px-2 py-1.5 rounded-md text-xs font-medium transition-colors truncate ${
                      isActive || slug === project.slug
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`
                  }
                >
                  {project.name}
                </NavLink>

                {/* 선택된 프로젝트의 문서 탭 */}
                {slug === project.slug && (
                  <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-2">
                    {docTabs.map((tab) => (
                      <NavLink
                        key={tab.key}
                        to={`/${project.slug}/${tab.key}`}
                        onClick={onClose}
                        end
                        className={({ isActive }) =>
                          `block px-2 py-1 rounded text-[11px] transition-colors ${
                            isActive
                              ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/50 dark:bg-indigo-500/5'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`
                        }
                      >
                        {tab.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}
