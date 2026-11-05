import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The backend checks Origin against WEB_ORIGIN, so open the site at http://localhost:5173 (not 127.0.0.1).
    // API_PROXY_TARGET points elsewhere when 8080 is taken by another local service.
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8080' },
  },
})
