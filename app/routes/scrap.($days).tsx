import type { LoaderFunctionArgs } from '@remix-run/node'
import type { RouterParams } from '../../routes'
import { prisma } from '../prisma.server'
import { scrap } from '../scraper'

export async function loader({ context, ...args }: LoaderFunctionArgs) {
  if (['127.0.0.1', '::ffff:127.0.0.1', '::1'].includes(context.request.ip)) {
    const start = Date.now()

    const [countCacheItemsBefore, countShowtimesBefore, countMoviesBefore] = await Promise.all([
      prisma.scrapedUrl.count(),
      prisma.showtime.count(),
      prisma.movie.count(),
    ])

    const params = args.params as RouterParams['/scrap/:days?']
    const days = Number(params.days)

    scrap(days).then(async () => {
      const [countCacheItemsAfter, countShowtimesAfter, countMoviesAfter] = await Promise.all([
        prisma.scrapedUrl.count(),
        prisma.showtime.count(),
        prisma.movie.count(),
      ])

      const duration = Date.now() - start

      console.log(`CachedUrls: ${countCacheItemsBefore} -> ${countCacheItemsAfter}`)
      console.log(`Movies: ${countMoviesBefore} -> ${countMoviesAfter}`)
      console.log(`Showtimes: ${countShowtimesBefore} -> ${countShowtimesAfter}`)
      console.log(`Done in ${duration}ms`)
    })
  }

  return new Response(null, { status: 200 })
}
