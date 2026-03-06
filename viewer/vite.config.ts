import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// 루트의 projects/ 폴더를 /projects/ 경로로 서빙하는 플러그인
function serveProjects(): import('vite').Plugin {
  const projectsDir = path.resolve(__dirname, '../projects')

  return {
    name: 'serve-projects',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = req.url?.match(/^\/projects\/(.+)$/)
        if (!match) return next()

        const filePath = path.join(projectsDir, match[1])
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return next()

        const ext = path.extname(filePath).toLowerCase()
        const contentTypes: Record<string, string> = {
          '.json': 'application/json; charset=utf-8',
          '.md': 'text/markdown; charset=utf-8',
        }
        res.setHeader('Content-Type', contentTypes[ext] ?? 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveProjects()],
  server: {
    fs: {
      allow: ['.', '../projects'],
    },
  },
})
