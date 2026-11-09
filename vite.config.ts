import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { prismaVitePlugin } from '@prisma/orm-postgres/vite-plugin-contract-emit'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { generateIconSprites, svgsDir } from './scripts/generate-svg-icons-sprite.ts'

/** Generates the icon sprites when the build or the dev server starts, and again when an svg changes */
function iconSprites(): Plugin {
  return {
    name: 'icon-sprites',
    buildStart: () => generateIconSprites(),
    configureServer(server) {
      const dir = resolve(svgsDir)
      server.watcher.add(dir)
      server.watcher.on('all', (_event, file) => {
        if (file.startsWith(dir) && file.endsWith('.svg')) void generateIconSprites()
      })
    },
  }
}

export default defineConfig(({ command }) => {
  // The dev server reads .env like the scripts do (production gets its env from Fly)
  if (command === 'serve' && existsSync('.env')) process.loadEnvFile('.env')

  return {
    server: { port: 3000 },
    plugins: [
      tailwindcss(),
      reactRouter(),
      // Re-emits prisma/contract.json and contract.d.ts when prisma/contract.prisma changes (dev only)
      prismaVitePlugin('prisma.config.ts'),
      iconSprites(),
    ],
  }
})
