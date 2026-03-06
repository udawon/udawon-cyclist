import { Routes, Route, Navigate } from 'react-router'
import AppLayout from './components/layout/AppLayout'
import WelcomePage from './components/pages/WelcomePage'
import MindmapPage from './components/pages/MindmapPage'
import MarkdownPage from './components/pages/MarkdownPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<WelcomePage />} />
        <Route path=":slug">
          <Route index element={<NavigateToMindmap />} />
          <Route path="mindmap" element={<MindmapPage />} />
          <Route path="spec" element={<MarkdownPage doc="SPEC" />} />
          <Route path="prd" element={<MarkdownPage doc="PRD" />} />
          <Route path="tasks" element={<MarkdownPage doc="TASKS" />} />
        </Route>
      </Route>
    </Routes>
  )
}

function NavigateToMindmap() {
  return <Navigate to="mindmap" replace />
}
