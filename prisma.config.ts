import { existsSync } from 'node:fs'
import { defineConfig } from '@prisma/orm-postgres/config'
import { definePrismaConfig } from 'prisma/config'

if (existsSync('.env')) process.loadEnvFile('.env')

export default definePrismaConfig({
  orm: defineConfig({
    contract: './prisma/contract.prisma',
    db: { connection: process.env['DATABASE_URL'] },
    migrations: { dir: 'prisma/migrations' },
  }),
})
