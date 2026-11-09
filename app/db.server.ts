import postgres from '@prisma/orm-postgres/runtime'
import { contract } from '../src/prisma/db'

function createDb() {
  return postgres({ contract, url: process.env['DATABASE_URL']! })
}

type Db = ReturnType<typeof createDb>

/**
 * The app's own client, like Prisma's React Router example. In dev, Vite re-runs this module
 * on every reload (twice when the contract is re-emitted), so keep one client in globalThis
 * while the contract is unchanged and close the previous one when it changes: reloads no
 * longer leave connection pools open.
 */
function getDb(): Db {
  if (!import.meta.hot) return createDb()

  const key = JSON.stringify(contract)
  const cache = globalThis as typeof globalThis & { cinecalDb?: { key: string; db: Db } }
  if (cache.cinecalDb?.key !== key) {
    void cache.cinecalDb?.db.close()
    cache.cinecalDb = { key, db: createDb() }
  }
  return cache.cinecalDb.db
}

export const db = getDb()
