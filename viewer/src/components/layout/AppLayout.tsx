import { useState, useEffect } from 'react'
import { Outlet } from 'react-router'
import Header from './Header'
import Sidebar from './Sidebar'
import { useThemeStore } from '../../stores/useThemeStore'
import { useProjectStore } from '../../stores/useProjectStore'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const initTheme = useThemeStore((s) => s.initTheme)
  const fetchProjects = useProjectStore((s) => s.fetchProjects)

  useEffect(() => {
    initTheme()
    fetchProjects()
  }, [initTheme, fetchProjects])

  return (
    <div className="h-screen flex flex-col bg-[#fafbfc] dark:bg-gray-950">
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
