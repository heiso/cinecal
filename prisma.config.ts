import { existsSync } from 'node:fs'
import { definePrismaConfig } from '@prisma/cli-engine'
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config'

// Node loads .env itself (production gets its env from Fly)
if (existsSync('.env')) process.loadEnvFile('.env')

export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/prisma/contract.prisma',
    db: {
      connection: process.env['DATABASE_URL']!,
    },
  }),
})
