import { parseArgs } from 'node:util'
import { db } from '../src/prisma/db.ts'
import { savePosterBlurHashes, scrapPosters, scrapShowtimes, scrapTicketing } from './scraper.ts'

const { positionals } = parseArgs({ allowPositionals: true })

const [step, days] = positionals

try {
  switch (step) {
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
