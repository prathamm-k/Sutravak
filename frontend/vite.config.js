import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the current directory
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_TARGET || 'http://127.0.0.1:9001'

  return {
    plugins: [react()],
    server: {
      port: 2001,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        }
      }
    }
  }
})

