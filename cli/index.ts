import { setTimeout } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { db } from '../src/prisma/db.ts'
import { savePosterBlurHashes, scrapPosters, scrapShowtimes, scrapTicketing } from './scraper.ts'

const { positionals } = parseArgs({ allowPositionals: true })

const [step, days] = positionals

const SCHEDULE_INTERVAL_MS = 30 * 60 * 1000

/**
 * Scrapes showtimes, then posters and their blurhashes, now and every 30 minutes
 * (the scraper service of the docker compose). Allocine limits requests per IP, so each
 * run fetches what it can and the next one fills the gaps from cache (see cli/scraper.ts).
 */
async function schedule(days: number) {
  for (;;) {
    const startedAt = Date.now()
    try {
      await scrapShowtimes(days)
      await scrapPosters()
      await savePosterBlurHashes()
    } catch (error) {
      console.error(error)
    }
    await setTimeout(Math.max(0, SCHEDULE_INTERVAL_MS - (Date.now() - startedAt)))
  }
}

try {
  switch (step) {
    case 'schedule':
      await schedule(parseInt(days ?? '90'))
      break

    case 'scrapShowtimes':
      await scrapShowtimes(parseInt(days ?? '90'))
      break

    case 'scrapTicketing':
      await scrapTicketing()
      break

    case 'scrapPosters':
      await scrapPosters()
      break

    case 'savePosterBlurHashes':
      await savePosterBlurHashes()
      break

    default:
      console.error(`step ${step} does not exist`)
      process.exitCode = 1
  }
} finally {
  // The connection pool keeps the event loop alive
  await db.close()
}
