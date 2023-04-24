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
      name: 'api',
      watch: ['src/**/*', '.env'],
      ignore_watch: ['src/app'],
      script: 'npm run dev',
    },

    {
      ...common,
      name: 'app',
      script: 'npx remix watch',
    },

    {
      ...common,
      name: 'studio',
      script: 'npx prisma studio --browser none',
    },
  ],
}

module.exports = config
