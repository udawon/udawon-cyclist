import { useThemeStore } from '../../stores/useThemeStore'

interface Props {
  onToggleSidebar: () => void
}

export default function Header({ onToggleSidebar }: Props) {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <header className="h-12 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center px-4 flex-shrink-0">
      {/* 모바일 사이드바 토글 */}
      <button
        onClick={onToggleSidebar}
        className="mr-3 p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 로고 */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Cyclist</span>
      </div>

      <div className="flex-1" />

      {/* 다크모드 토글 */}
      <button
        onClick={toggleTheme}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
      >
        {theme === 'dark' ? (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
    </header>
  )
}
