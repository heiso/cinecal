// @ts-check

/**
 * @type {import('pm2/types').StartOptions}
 */
const common = {
  instances: 1,
  autorestart: false,
  log_date_format: 'HH:mm:ss',
}

/**
 * @type {{apps: import('pm2/types').StartOptions[]}}
 */
const config = {
  apps: [
    {
      ...common,
      name: 'prisma',
      script: 'npx prisma contract emit',
      watch: ['prisma/contract.prisma'],
    },

    {
      ...common,
      name: 'icons',
      script: 'node scripts/generate-svg-icons-sprite.ts',
      watch: ['scripts/generate-svg-icons-sprite.ts', './svgs/**/*.svg'],
    },

    {
      ...common,
      // Vite dev server with HMR, it regenerates the route types on change
      name: 'server',
      script: 'node --inspect --conditions=development node_modules/@react-router/dev/bin.cjs dev',
      watch: ['.env', 'vite.config.ts', 'react-router.config.ts'],
    },
  ],
}

module.exports = config
