import { existsSync } from 'node:fs'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  // The dev server reads .env like the scripts do (production gets its env from Fly)
  if (command === 'serve' && existsSync('.env')) process.loadEnvFile('.env')

  return {
    server: { port: 3000 },
    plugins: [tailwindcss(), reactRouter()],
  }
})
