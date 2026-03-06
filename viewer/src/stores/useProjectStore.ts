import { create } from 'zustand'
import type { Project } from '../lib/types'

interface ProjectState {
  projects: Project[]
  isLoading: boolean
  error: string | null
  fetchProjects: () => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    if (get().projects.length > 0) return
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/projects/index.json')
      if (!res.ok) throw new Error('프로젝트 목록을 불러올 수 없습니다')
      const projects: Project[] = await res.json()
      set({ projects, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },
}))
