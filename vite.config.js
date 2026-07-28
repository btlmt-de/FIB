import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    proxy: {
      "/stats-api": {
        target: "https://forceitembattle.net",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  base: '/'
})