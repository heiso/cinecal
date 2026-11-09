import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.spec.ts'],
    exclude: ['node_modules/**', 'build/**'],
    environment: 'node',
    // Same time zone as production (deploy/compose.yml), the date filters and the scraper depend on it
    env: { TZ: 'Europe/Paris' },
    clearMocks: true,
  },
})
