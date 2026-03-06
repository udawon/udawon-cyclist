import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  initTheme: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',

  initTheme: () => {
    const stored = localStorage.getItem('theme') as Theme | null
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = stored ?? (systemDark ? 'dark' : 'light')

    document.documentElement.classList.toggle('dark', theme === 'dark')
    set({ theme })
  },

  toggleTheme: () => {
    set((state) => {
      const next: Theme = state.theme === 'light' ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', next === 'dark')
      localStorage.setItem('theme', next)
      return { theme: next }
    })
  },
}))
