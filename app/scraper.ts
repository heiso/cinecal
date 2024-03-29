import {
  Language,
  PrismaClient,
  TagCategory,
  type MovieTag,
  type Prisma,
  type ShowtimeTag,
  type Theater,
} from '@prisma/client'
import { getPixels } from '@unpic/pixels'
import { encode } from 'blurhash'
import { add, endOfDay, endOfYesterday } from 'date-fns'
import type { Middleware } from 'koa'
import type { AllocineResponse, Credit, Release } from './allocine-types'

const API_ENDPOINT = 'https://api.imagekit.io/v1/files'
const URL_ALLOCINE_SHOWTIMES = 'https://www.allocine.fr/_/showtimes'
// const URL_THEMOVIEDBID = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.THEMOVIEDBID_API_KEY}&language=fr-FR&query=`
// const URL_THEMOVIEDBID_PICTURES = `https://image.tmdb.org/t/p/original`
const EXCLUSION_LIST = ['Rex Studios']
const IMAGEKIT_FOLDER = process.env.ENV === 'development' ? 'posters-dev' : 'posters-prod'
const IMAGEKIT_URL = `https://ik.imagekit.io/cinecal/${IMAGEKIT_FOLDER}`
const POSTER_RATIO = 62 / 85
const SHOWTIMES_EXPIRATION_DATE = endOfDay(new Date())
const TICKETING_DETAILS_EXPIRATION_DATE = add(new Date(), { days: 3 })

const prisma = new PrismaClient()

let foundShowtimeAllocineIds: number[] = []

function getUniqueAllocineShowtimes(showtimes: AllocineResponse['results'][0]['showtimes']) {
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
    console.log(`${url} - cached`)
    return cached.content
  }

  console.log(url)

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`${url} - error`)
  }

  const content = await res.text()

  await prisma.scrapedUrl.upsert({
    where: { url },
    create: { url, content, expiresAt: TICKETING_DETAILS_EXPIRATION_DATE },
    update: { content, expiresAt: TICKETING_DETAILS_EXPIRATION_DATE },
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
    console.log(`${url} - cached`)
    return JSON.parse(cached.content) as unknown as AllocineResponse
  }

  console.log(url)

  const res = await fetch(url, {
    method: 'post',
  })

  if (!res.ok) {
    throw new Error(`${url} - error`)
  }

  const content = await res.text()

  const json = JSON.parse(content) as AllocineResponse

  // if (json.error) {
  //   throw new Error(`${url} - error`)
  // }

  await prisma.scrapedUrl.upsert({
    where: { url },
    create: { url, content, expiresAt: SHOWTIMES_EXPIRATION_DATE },
    update: { content, expiresAt: SHOWTIMES_EXPIRATION_DATE },
  })

  return json
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
  > = {},
): Promise<Prisma.ShowtimeCreateInput[]> {
  const theater = theaters[theaterIndex]
  const pageParam = page > 1 ? `p-${page}/` : ''
  const dayParam = day > 0 ? `d-${day}/` : ''
  const url = `${URL_ALLOCINE_SHOWTIMES}/theater-${theater.allocineId}/${dayParam}${pageParam}`

  try {
    const body = await getAllocineShowtimes(url)

    for (const result of body.results.filter(
      ({ movie }) => !EXCLUSION_LIST.includes(movie.title),
    )) {
      try {
        const movie = await prisma.movie.upsert({
          where: { allocineId: result.movie.internalId },
          update: {},
          create: {
            originalTitle: result.movie.originalTitle,
            title: result.movie.title,
            duration: getDuration(result.movie.runtime),
            synopsis: result.movie.synopsis,
            releaseDate: getReleaseDate(result.movie.releases),
            allocineId: result.movie.internalId,
            posterAllocineUrl: result.movie.poster?.url,
            director: getDirector(result.movie.credits),
            Tags: {
              connectOrCreate: [
                ...result.movie.relatedTags.reduce<
                  Prisma.MovieTagCreateOrConnectWithoutMoviesInput[]
                >((acc, { name, tags }) => {
                  if (tags.list.find((type) => 'Tag.Type.SubGenre' === type)) {
                    acc.push({
                      where: { name },
                      create: {
                        name,
                        category: TagCategory.SUB_GENRE,
                      },
                    })
                  } else if (tags.list.find((type) => 'Tag.Type.Characteristic' === type)) {
                    acc.push({
                      where: { name },
                      create: {
                        name,
                        category: TagCategory.CHARACTERISTIC,
                      },
                    })
                  }
                  return acc
                }, [] as Prisma.MovieTagCreateOrConnectWithoutMoviesInput[]),
                ...result.movie.genres.map<Prisma.MovieTagCreateOrConnectWithoutMoviesInput>(
                  ({ translate }) => ({
                    where: { name: translate },
                    create: {
                      name: translate,
                      category: TagCategory.GENRE,
                    },
                  }),
                ),
              ],
            },
          },
        })

        const data = getUniqueAllocineShowtimes(result.showtimes).map((showtime) => ({
          allocineId: showtime.internalId,
          date: new Date(showtime.startsAt),
          isPreview: showtime.isPreview,
          language: showtime.tags.includes('Localization.Language.French')
            ? Language.VF
            : Language.VO,
          ticketingUrl: showtime.data.ticketing?.[0]?.urls[0],
          theaterId: theater.id,
          movieId: movie.id,
        }))

        await prisma.showtime.createMany({
          data,
          skipDuplicates: true,
        })

        foundShowtimeAllocineIds = [
          ...foundShowtimeAllocineIds,
          ...data.map(({ allocineId }) => allocineId),
        ]
      } catch (err) {
        console.error(err)
      }
    }

    if (Number(body.pagination.page) < body.pagination.totalPages) {
      return scrapAllocineShowtimes(
        theaters,
        theaterIndex,
        maxDay,
        day,
        page + 1,
        showtimeCreateInputs,
      )
    }
  } catch (err) {
    console.error(err)
  }

  if (day < maxDay) {
    return scrapAllocineShowtimes(theaters, maxDay, theaterIndex, day + 1, 1, showtimeCreateInputs)
  }

  if (theaters[theaterIndex + 1]) {
    return scrapAllocineShowtimes(theaters, maxDay, theaterIndex + 1, 0, 1, showtimeCreateInputs)
  }

  return Object.values(showtimeCreateInputs)
}

async function scrapAllocineTicketingUrl(): Promise<void> {
  const movieTags = (await prisma.movieTag.findMany({
    where: { regExp: { not: null } },
  })) as Array<Omit<MovieTag, 'regExp'> & { regExp: NonNullable<MovieTag['regExp']> }>
  const showtimeTags = (await prisma.showtimeTag.findMany({
    where: { regExp: { not: null } },
  })) as Array<Omit<ShowtimeTag, 'regExp'> & { regExp: NonNullable<ShowtimeTag['regExp']> }>

  const showtimes = await prisma.showtime.findMany({
    where: {
      ticketingUrl: { not: null },
    },
    select: {
      id: true,
      movieId: true,
      ticketingUrl: true,
    },
  })

  for (const { id, movieId, ticketingUrl } of showtimes.filter(
    ({ ticketingUrl }) => ticketingUrl,
  )) {
    try {
      const details = await getAllocineTicketingDetails(ticketingUrl!)
      let prices: { label: string; description?: string | null; price: number }[] = []

      const regx = new RegExp(
        /<p>([^<]*)(?:<a[^<]*title\=\"([^<]*)"[^<]*>i<\/a>)?<span[^<]*[^>]*>(\d*.\d*)\ &euro;/g,
      )
      const matches = [...details.matchAll(regx)]

      prices = matches.map((match) => ({
        label: match[1]
          ?.replace(/&#128;/g, '€')
          .replace(/(&#(\d+);)/g, (match, capture, charCode) => String.fromCharCode(charCode)),
        description: match[2]
          ?.replace(/&#128;/g, '€')
          .replace(/(&#(\d+);)/g, (match, capture, charCode) => String.fromCharCode(charCode)),
        price: parseInt(match[3]),
      }))

      await prisma.movie.update({
        where: { id: movieId },
        data: {
          Tags: {
            connect: movieTags
              .filter(({ regExp }) => new RegExp(regExp, 'i').test(details))
              .map(({ id }) => ({
                id,
              })),
          },
        },
      })

      const oldPrices = await prisma.price.findMany({
        where: { showtimeId: id },
        select: { id: true },
      })

      await prisma.showtime.update({
        where: { id },
        data: {
          Tags: {
            connect: showtimeTags
              .filter(({ regExp }) => new RegExp(regExp, 'i').test(details))
              .map(({ id }) => ({
                id,
              })),
          },
          Prices: {
            createMany: { data: prices },
          },
        },
      })

      await prisma.price.deleteMany({
        where: { id: { in: oldPrices.map((price) => price.id) } },
      })
    } catch (err) {
      console.error(err)
    }
  }
}

async function getUploadedPosterList(): Promise<
  { filePath: string; name: string; url: string; customMetadata: Record<string, unknown> }[]
> {
  const response = await fetch(API_ENDPOINT, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(process.env.IMAGEKIT_API_KEY + ':').toString('base64')}`,
    },
  })

  const body = await response.json()

  return body.filter((file: Record<string, unknown>) =>
    (file.filePath as string).includes(IMAGEKIT_FOLDER),
  )
}

async function scrapAllocinePosters() {
  const movies = await prisma.movie.findMany({
    where: { posterAllocineUrl: { not: null } },
    select: { id: true, originalTitle: true, posterAllocineUrl: true },
    orderBy: { id: 'asc' },
  })

  const posters = await getUploadedPosterList()

  for (const movie of movies) {
    try {
      let posterUrl: string

      const poster = posters.find(
        (poster) => poster.customMetadata.allocineUrl === movie.posterAllocineUrl,
      )

      if (poster) {
        console.log(`${poster.url} - existing`)
        posterUrl = poster.name
      } else {
        const body = new FormData()
        body.append('file', movie.posterAllocineUrl!)
        body.append('fileName', movie.id.toString())
        body.append('folder', IMAGEKIT_FOLDER)
        body.append(
          'customMetadata',
          JSON.stringify({
            id: movie.id,
            title: movie.originalTitle,
            allocineUrl: movie.posterAllocineUrl,
          }),
        )

        const response = await fetch(`${API_ENDPOINT}/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(process.env.IMAGEKIT_API_KEY + ':').toString(
              'base64',
            )}`,
          },
          body,
        })

        if (response.status !== 200) {
          console.error(await response.text())
        }

        const json = await response.json()
        posterUrl = json.name

        console.log(json.url)
      }

      await prisma.movie.update({ where: { id: movie.id }, data: { posterUrl } })
    } catch (err) {
      console.error(err)
    }
  }
}

async function savePosterBlurHashes() {
  const movies = await prisma.movie.findMany({
    where: { posterUrl: { not: null }, posterBlurHash: null },
    select: { id: true, posterUrl: true },
    orderBy: { id: 'asc' },
  })

  for (const movie of movies) {
    try {
      const url = `${IMAGEKIT_URL}/${movie.posterUrl}/tr:w-400,q-50,ar-62-85`
      const pixels = await getPixels(url)
      const data = Uint8ClampedArray.from(pixels.data)
      const blurHash = encode(data, pixels.width, pixels.height, Math.round(9 * POSTER_RATIO), 9)

      console.log(`${url} -> ${blurHash}`)

      await prisma.movie.update({ where: { id: movie.id }, data: { posterBlurHash: blurHash } })
    } catch (err) {
      console.error(err)
    }
  }
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

  await scrapAllocineShowtimes(theaters, maxDay)

  await scrapAllocineTicketingUrl()

  await scrapAllocinePosters()

  await savePosterBlurHashes()

  await prisma.showtime.deleteMany({
    where: { allocineId: { notIn: foundShowtimeAllocineIds } },
  })
}

export function scraperMiddleware(): Middleware {
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

      console.log(`CachedUrls: ${countCacheItemsBefore} -> ${countCacheItemsAfter}`)
      console.log(`Movies: ${countMoviesBefore} -> ${countMoviesAfter}`)
      console.log(`Showtimes: ${countShowtimesBefore} -> ${countShowtimesAfter}`)
      console.log(`Done in ${duration}ms`)
    } else {
      return next()
    }
  }
}
