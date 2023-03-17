import { Language, Prisma, PrismaClient, Showtime, Theater } from '@prisma/client'
import { endOfDay, endOfWeek, endOfYesterday } from 'date-fns'
import { DefaultState, Middleware } from 'koa'
import { Context } from './core/context'
import { log } from './core/logger'
import { AllocineResponse, Credit, Release } from './interfaces'

export const URL_ALLOCINE_SHOWTIMES = 'https://www.allocine.fr/_/showtimes'
const URL_THEMOVIEDBID = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.THEMOVIEDBID_API_KEY}&language=fr-FR&query=`
const URL_THEMOVIEDBID_PICTURES = `https://image.tmdb.org/t/p/original`
const EXCLUSION_LIST = ['Rex Studios']

const REGEXP_BY_MOVIE_TAGS = {
  Oscar: new RegExp(/oscar/i),
  César: new RegExp(/c\&eacute\;sar/i),
}
const REGEXP_BY_SHOWTIME_TAGS = {
  'Grand Large': new RegExp(/grand large/i),
  'Salle 1': new RegExp(/salle grand rex/i),
  // 'Salle 2': new RegExp(/salle rex 2/i),
  // 'Salle 3': new RegExp(/salle rex 3/i),
  // 'Salle 4': new RegExp(/salle rex 4/i),
  // 'Salle 5': new RegExp(/salle rex 5/i),
  // 'Salle 6': new RegExp(/salle rex 6/i),
  // 'Salle 7': new RegExp(/salle rex 7/i),
  Marathon: new RegExp(/marathon/i),
}

const prisma = new PrismaClient()

export function getUniqueAllocineShowtimes(showtimes: AllocineResponse['results'][0]['showtimes']) {
  const showtimesArray = [...showtimes.local, ...showtimes.multiple, ...showtimes.original]

  return showtimesArray.reduce<typeof showtimesArray>((acc, showtime) => {
    if (!acc.find(({ internalId }) => internalId === showtime.internalId)) {
      acc.push(showtime)
    }
    return acc
  }, [])
}

function getDuration(runtime: string) {
  const split = runtime.split('h')
  if (!split) return 0
  return parseInt(split[0]) * 60 + parseInt(split[1])
}

function getReleaseDate(releases: Release[]) {
  const date = releases.find((release) => release.name === 'Released')?.releaseDate?.date
  if (!date) {
    return null
  }
  return new Date(date)
}

function getDirector(credits: Credit[]) {
  const persons = credits
    .filter((credit) => credit.position?.name === 'DIRECTOR')
    .map((credit) => credit.person)

  if (persons.length === 0) {
    return null
  }

  return persons.map((person) => `${person.firstName} ${person.lastName}`).join(', ')
}

async function getAllocineTicketingDetails(url: string) {
  const cached = await prisma.scrapedUrl.findFirst({
    where: {
      url,
      expiresAt: { gte: new Date() },
    },
    select: { content: true },
  })

  if (cached) {
    log.info(`${url} - cached`)
    return cached.content
  }

  log.info(url)
  const res = await fetch(url)
  const content = await res.text()

  await prisma.scrapedUrl.upsert({
    where: { url },
    create: { url, content, expiresAt: endOfWeek(new Date()) },
    update: { content, expiresAt: endOfWeek(new Date()) },
  })

  return content
}

async function getAllocineShowtimes(url: string) {
  const cached = await prisma.scrapedUrl.findFirst({
    where: {
      url,
      expiresAt: { gte: new Date() },
    },
    select: { content: true },
  })

  if (cached) {
    log.info(`${url} - cached`)
    return JSON.parse(cached.content) as unknown as AllocineResponse
  }

  log.info(url)
  const res = await fetch(url, {
    method: 'post',
  })
  const content = await res.text()

  await prisma.scrapedUrl.upsert({
    where: { url },
    create: { url, content, expiresAt: endOfDay(new Date()) },
    update: { content, expiresAt: endOfDay(new Date()) },
  })

  return JSON.parse(content) as AllocineResponse
}

async function scrapAllocineShowtimes(
  theaters: Theater[],
  maxDay: number,
  theaterIndex: number = 0,
  day: number = 0,
  page: number = 1,
  showtimeCreateInputs: Record<
    ReturnType<typeof getUniqueAllocineShowtimes>[0]['internalId'],
    Prisma.ShowtimeCreateInput
  > = {}
): Promise<Prisma.ShowtimeCreateInput[]> {
  const theater = theaters[theaterIndex]
  const pageParam = page > 1 ? `p-${page}/` : ''
  const dayParam = day > 0 ? `d-${day}/` : ''
  const url = `${URL_ALLOCINE_SHOWTIMES}/theater-${theater.allocineId}/${dayParam}${pageParam}`

  const body = await getAllocineShowtimes(url)

  body.results
    .filter(({ movie }) => !EXCLUSION_LIST.includes(movie.title))
    .forEach((result) =>
      getUniqueAllocineShowtimes(result.showtimes).forEach((showtime) => {
        showtimeCreateInputs[showtime.internalId] = {
          allocineId: showtime.internalId,
          date: new Date(showtime.startsAt),
          isPreview: showtime.isPreview,
          language: showtime.tags.includes('Localization.Language.French')
            ? Language.VF
            : Language.VO,
          ticketingUrl: showtime.data.ticketing?.[0]?.urls[0],
          Movie: {
            connectOrCreate: {
              where: { allocineId: result.movie.internalId },
              create: {
                originalTitle: result.movie.originalTitle,
                title: result.movie.title,
                duration: getDuration(result.movie.runtime),
                synopsis: result.movie.synopsisFull,
                releaseDate: getReleaseDate(result.movie.releases),
                allocineId: result.movie.internalId,
                posterUrl: result.movie.poster?.url,
                director: getDirector(result.movie.credits),
              },
            },
          },
          Theater: { connect: { id: theater.id } },
        }
      })
    )

  if (Number(body.pagination.page) < body.pagination.totalPages) {
    return scrapAllocineShowtimes(
      theaters,
      theaterIndex,
      maxDay,
      day,
      page + 1,
      showtimeCreateInputs
    )
  }

  if (day < maxDay) {
    return scrapAllocineShowtimes(theaters, maxDay, theaterIndex, day + 1, 1, showtimeCreateInputs)
  }

  if (theaters[theaterIndex + 1]) {
    return scrapAllocineShowtimes(theaters, maxDay, theaterIndex + 1, 0, 1, showtimeCreateInputs)
  }

  return Object.values(showtimeCreateInputs)
}

async function scrapAllocineTicketingUrl(showtimes: Showtime[]): Promise<void> {
  await Promise.allSettled(
    showtimes
      .filter(({ ticketingUrl }) => ticketingUrl)
      .map(async ({ id, movieId, ticketingUrl }) => {
        const details = await getAllocineTicketingDetails(ticketingUrl!)

        await prisma.movie.update({
          where: { id: movieId },
          data: {
            tags: {
              push: Object.keys(REGEXP_BY_MOVIE_TAGS).filter((tag) =>
                REGEXP_BY_MOVIE_TAGS[tag as keyof typeof REGEXP_BY_MOVIE_TAGS].test(details)
              ),
            },
          },
        })

        return prisma.showtime.update({
          where: { id },
          data: {
            tags: Object.keys(REGEXP_BY_SHOWTIME_TAGS).filter((tag) =>
              REGEXP_BY_SHOWTIME_TAGS[tag as keyof typeof REGEXP_BY_SHOWTIME_TAGS].test(details)
            ),
          },
        })
      })
  ).catch((err) => log.error(err))
}

export async function scrap(maxDay: number = 10, reset = false) {
  if (reset) {
    await prisma.$transaction([prisma.showtime.deleteMany(), prisma.movie.deleteMany()])
  }

  const [theaters] = await prisma.$transaction([
    prisma.theater.findMany(),
    prisma.scrapedUrl.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    }),
    prisma.showtime.deleteMany({
      where: { date: { lt: endOfYesterday() } },
    }),
    prisma.movie.deleteMany({
      where: { Showtimes: { none: {} } },
    }),
  ])

  const allocineShowtimes = await scrapAllocineShowtimes(theaters, maxDay)

  const showtimes = await prisma.$transaction(
    allocineShowtimes.map((showtime) =>
      prisma.showtime.upsert({
        where: {
          allocineId: showtime.allocineId,
        },
        update: showtime,
        create: showtime,
      })
    )
  )

  await scrapAllocineTicketingUrl(showtimes)
}
export function scraperMiddleware(): Middleware<DefaultState, Context> {
  return async function scraperMiddleware(ctx, next) {
    if (
      ctx.path.startsWith('/scrap') &&
      ['127.0.0.1', '::ffff:127.0.0.1', '::1'].includes(ctx.ip)
    ) {
      const start = Date.now()

      const [countCacheItemsBefore, countShowtimesBefore, countMoviesBefore] = await Promise.all([
        ctx.prisma.scrapedUrl.count(),
        ctx.prisma.showtime.count(),
        ctx.prisma.movie.count(),
      ])

      ctx.res.statusCode = 200
      ctx.res.end()

      const match = ctx.path.match(/([0-9]+)/)
      const days = match ? parseInt(match[0]) : 90

      await scrap(days)

      const [countCacheItemsAfter, countShowtimesAfter, countMoviesAfter] = await Promise.all([
        ctx.prisma.scrapedUrl.count(),
        ctx.prisma.showtime.count(),
        ctx.prisma.movie.count(),
      ])

      const duration = Date.now() - start

      log.info(`CachedUrls: ${countCacheItemsBefore} -> ${countCacheItemsAfter}`)
      log.info(`Movies: ${countMoviesBefore} -> ${countMoviesAfter}`)
      log.info(`Showtimes: ${countShowtimesBefore} -> ${countShowtimesAfter}`)
      log.info(`Done in ${duration}ms`)
    } else {
      return next()
    }
  }
}
