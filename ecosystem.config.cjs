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
      script: 'npx prisma generate',
      watch: ['prisma/schema.prisma'],
    },

    {
      ...common,
      name: 'icons',
      script: 'npx tsx generate-svg-icons-sprite.ts',
      watch: ['generate-svg-icons-sprite.ts', './svgs/**/*.svg'],
    },

    {
      ...common,
      name: 'routes',
      script: 'npx tsx generate-remix-routes.ts',
      watch: ['generate-remix-routes.ts', 'remix.config.js', './app/routes/**/*.tsx'],
    },

    {
      ...common,
      name: 'server',
      watch: ['server/**/*', '.env'],
      script: 'node --env-file=.env --inspect --import tsx server',
    },
  ],
}

module.exports = config
