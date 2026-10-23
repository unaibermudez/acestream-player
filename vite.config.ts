import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// En desarrollo, /ace/ se redirige a un motor local (ACE_ENGINE_URL) igual que hace nginx en producción.
const engineUrl = process.env.ACE_ENGINE_URL ?? 'http://localhost:6878'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ace': { target: engineUrl, changeOrigin: true },
      '/webui/api': { target: engineUrl, changeOrigin: true },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
