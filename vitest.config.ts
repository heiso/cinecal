import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.spec.ts'],
    exclude: ['node_modules/**', 'build/**'],
    environment: 'node',
    // Same timezone as production (fly.toml), date filters depend on it
    env: { TZ: 'Europe/Paris' },
    clearMocks: true,
  },
})
