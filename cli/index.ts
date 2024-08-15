import { parseArgs } from 'util'
import { savePosterBlurHashes, scrapPosters, scrapShowtimes, scrapTicketing } from './scraper.js'

type Step = 'scrapShowtimes' | 'scrapTicketing' | 'scrapPosters' | 'savePosterBlurHashes'

const { positionals } = parseArgs({
  allowPositionals: true,
  args: process.argv,
})

const step = positionals[2] as Step | undefined

;(async () => {
  switch (step) {
    case 'scrapShowtimes':
      return scrapShowtimes(parseInt(positionals[3] ?? '90'))

    case 'scrapTicketing':
      return scrapTicketing()

    case 'scrapPosters':
      return scrapPosters()

    case 'savePosterBlurHashes':
      return savePosterBlurHashes()

    default:
      console.error(`step ${step} does not exist`)
  }
})()
