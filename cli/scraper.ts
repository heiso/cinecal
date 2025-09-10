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
import { add, addDays, endOfDay, format } from 'date-fns'
import type { AllocineResponse, Credit, Release } from './allocine-types'

const API_ENDPOINT = 'https://api.imagekit.io/v1/files'
const URL_ALLOCINE_SHOWTIMES = 'https://www.allocine.fr/_/showtimes'
// const URL_THEMOVIEDBID = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.THEMOVIEDBID_API_KEY}&language=fr-FR&query=`
// const URL_THEMOVIEDBID_PICTURES = `https://image.tmdb.org/t/p/original`
const EXCLUSION_LIST = ['Rex Studios', 'Sauvez le cinéma !']
const IMAGEKIT_FOLDER = process.env.ENV === 'development' ? 'posters-dev' : 'posters-prod'
const IMAGEKIT_URL = `https://ik.imagekit.io/cinecal/${IMAGEKIT_FOLDER}`
const POSTER_RATIO = 62 / 85
const SHOWTIMES_EXPIRATION_DATE = endOfDay(new Date())
const TICKETING_DETAILS_EXPIRATION_DATE = add(new Date(), { days: 3 })

const prisma = new PrismaClient()

function getUniqueAllocineShowtimes(showtimes: AllocineResponse['results'][0]['showtimes']) {
  const showtimesArray = [...showtimes.local, ...showtimes.multiple, ...showtimes.original]

  return showtimesArray.reduce<typeof showtimesArray>((acc, showtime) => {
    if (!acc.find(({ internalId }) => internalId === showtime.internalId)) {
      acc.push(showtime)
    }
    return acc
  }, [])
}

function getDuration(runtime: number | string) {
  if (typeof runtime === 'string') {
    const split = runtime.split('h')
    if (!split) return 0
    return parseInt(split[0]) * 60 + parseInt(split[1])
  }
  return runtime / 60 || 0
}

function getReleaseDate(releases: Release[]) {
  const date = releases.find((release) => release.name === 'Released')?.releaseDate?.date
  if (!date) {
    return null
  }
  return new Date(date)
}

function getDirector(credits: Credit[]) {
  /**
   * @todo allocine changed its api, credits is now edges and nodes
   */
  return null
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
    create: { url, content, expiresAt: TICKETING_DETAILS_EXPIRATION_DATE, type: 'TICKETING' },
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
    throw new Error(`HTTP ${res.status}`)
  }

  const content = await res.text()
  const json = JSON.parse(content) as AllocineResponse

  if (json.error) {
    if (json.message === 'no.showtime.error') {
      console.log(`${url} - no showtimes found`)
      return json
    }
    console.error(`${url} - error ${json.message || 'Unknown error'}`)
  }

  await prisma.scrapedUrl.upsert({
    where: { url },
    create: { url, content, expiresAt: SHOWTIMES_EXPIRATION_DATE, type: 'SHOWTIMES' },
    update: { content, expiresAt: SHOWTIMES_EXPIRATION_DATE },
  })

  return json
}

async function scrapAllocineShowtimes(
  theaters: Theater[],
  maxDay: number,
  foundShowtimeAllocineIds: Set<number>,
  successfulTheaterIds: Set<number> = new Set(),
  theaterIndex: number = 0,
  day: number = 0,
  page: number = 1,
  showtimeCreateInputs: Record<
    ReturnType<typeof getUniqueAllocineShowtimes>[0]['internalId'],
    Prisma.ShowtimeCreateInput
  > = {},
): Promise<{ showtimeInputs: Prisma.ShowtimeCreateInput[]; successfulTheaterIds: Set<number> }> {
  const theater = theaters[theaterIndex]
  const pageParam = page > 1 ? `p-${page}/` : ''
  const dayParam = day > 0 ? `d-${format(addDays(new Date(), day), 'yyyy-MM-dd')}/` : ''
  const url = `${URL_ALLOCINE_SHOWTIMES}/theater-${theater.allocineId}/${dayParam}${pageParam}`

  try {
    const body = await getAllocineShowtimes(url)

    if (!body) {
      console.error(
        `${theater.name} (${theater.allocineId}) - day ${day} page ${page} - API call failed, skipping`,
      )
      // Continue to next iteration without processing this failed call
    } else {
      // Mark theater as having at least one successful API call
      successfulTheaterIds.add(theater.id)

      console.log(
        `${theater.name} (${theater.allocineId}) - day ${day} page ${page} - found ${body.results.length} movies`,
      )

      for (const result of body.results) {
        try {
          if (result.movie === null) {
            console.log(
              `${theater.name} (${theater.allocineId}) - day ${day} page ${page} - skipping showtime with no movie object`,
            )
            continue
          } else if (EXCLUSION_LIST.includes(result.movie.title)) {
            console.log(
              `${theater.name} (${theater.allocineId}) - day ${day} page ${page} - skipping showtime for excluded movie "${result.movie.title}"`,
            )
            continue
          }

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
                    const resolvedName = typeof name === 'string' ? name : name.translate
                    if (tags.list.find((type) => 'Tag.Type.SubGenre' === type)) {
                      acc.push({
                        where: { name: resolvedName },
                        create: {
                          name: resolvedName,
                          category: TagCategory.SUB_GENRE,
                        },
                      })
                    } else if (tags.list.find((type) => 'Tag.Type.Characteristic' === type)) {
                      acc.push({
                        where: { name: resolvedName },
                        create: {
                          name: resolvedName,
                          category: TagCategory.CHARACTERISTIC,
                        },
                      })
                    }
                    return acc
                  }, [] as Prisma.MovieTagCreateOrConnectWithoutMoviesInput[]),
                  ...result.movie.genres.map<Prisma.MovieTagCreateOrConnectWithoutMoviesInput>(
                    (name) => {
                      const resolvedName = typeof name === 'string' ? name : name.translate
                      return {
                        where: { name: resolvedName },
                        create: {
                          name: resolvedName,
                          category: TagCategory.GENRE,
                        },
                      }
                    },
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

          data.forEach(({ allocineId }) => foundShowtimeAllocineIds.add(allocineId))
        } catch (err) {
          console.error(err)
        }
      }

      if (Number(body.pagination.page) < body.pagination.totalPages) {
        return scrapAllocineShowtimes(
          theaters,
          maxDay,
          foundShowtimeAllocineIds,
          successfulTheaterIds,
          theaterIndex,
          day,
          Number(body.pagination.page) + 1,
          showtimeCreateInputs,
        )
      }
    }
  } catch (err) {
    console.error(
      `${theater.name} (${theater.allocineId}) ${url} - day ${day} page ${page} - unexpected error:`,
      err,
    )
  }

  if (day < maxDay) {
    return scrapAllocineShowtimes(
      theaters,
      maxDay,
      foundShowtimeAllocineIds,
      successfulTheaterIds,
      theaterIndex,
      day + 1,
      1,
      showtimeCreateInputs,
    )
  }

  if (theaters[theaterIndex + 1]) {
    return scrapAllocineShowtimes(
      theaters,
      maxDay,
      foundShowtimeAllocineIds,
      successfulTheaterIds,
      theaterIndex + 1,
      0,
      1,
      showtimeCreateInputs,
    )
  }

  return { showtimeInputs: Object.values(showtimeCreateInputs), successfulTheaterIds }
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

type CustomMetadata = {
  id: number
  title: string
  allocineUrl: string | null
}

async function getUploadedPosterList(
  movieIds: number[],
): Promise<{ filePath: string; name: string; url: string; customMetadata: CustomMetadata }[]> {
  const movieIdsByPacks = movieIds.reduce<number[][]>((acc, id, index) => {
    if (index % 500 === 0) {
      acc.push([])
    }
    acc[acc.length - 1].push(id)
    return acc
  }, [])

  const moviePosters: {
    filePath: string
    name: string
    url: string
    customMetadata: CustomMetadata
  }[] = []

  for (const ids of movieIdsByPacks) {
    const url = new URL(API_ENDPOINT)
    url.searchParams.append('path', IMAGEKIT_FOLDER)
    url.searchParams.append('type', 'file')
    url.searchParams.append('fileType', 'image')
    url.searchParams.append('searchQuery', `"customMetadata.id" in [${ids.join(',')}]`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.IMAGEKIT_API_KEY + ':').toString('base64')}`,
      },
    })

    console.log(`getUploadedPosterList for ${ids.length} posters`, url.toString())

    if (!response.ok) {
      throw new Error(response.statusText)
    }

    const body = await response.json()

    if (!Array.isArray(body)) {
      console.error(body)
      throw new Error('body should be an array')
    }

    moviePosters.push(
      ...(body.filter((file: Record<string, unknown>) =>
        (file.filePath as string).includes(IMAGEKIT_FOLDER),
      ) as { filePath: string; name: string; url: string; customMetadata: CustomMetadata }[]),
    )

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return moviePosters
}

async function uploadAllocinePosterToImageKit(movie: {
  posterAllocineUrl: string | null
  id: number
  originalTitle: string
}) {
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
    } satisfies CustomMetadata),
  )

  const response = await fetch(`${API_ENDPOINT}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(process.env.IMAGEKIT_API_KEY + ':').toString('base64')}`,
    },
    body,
  })

  if (!response.ok || response.status !== 200) {
    console.error(response.status, response.statusText)
    console.error(await response.text())
    throw new Error(response.statusText)
  } else {
    const json = await response.json()

    return json.name
  }
}

async function scrapAllocinePosters() {
  const movies = await prisma.movie.findMany({
    where: { posterAllocineUrl: { not: null } },
    select: { id: true, originalTitle: true, posterAllocineUrl: true },
    orderBy: { id: 'desc' },
  })

  const posters = await getUploadedPosterList(movies.map(({ id }) => id))

  for (const movie of movies) {
    try {
      let posterUrl: string | null = null

      const poster = posters.find(
        (poster) =>
          poster.customMetadata.allocineUrl?.split('/').reverse()[0] ===
          movie.posterAllocineUrl?.split('/').reverse()[0],
      )

      console.log(`${movie.id} - ${movie.originalTitle}, ${movie.posterAllocineUrl}`)
      if (poster) {
        console.log(` - existing - ${poster.url}`)
        posterUrl = poster.name
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500))
        console.log(` - uploading...`)
        try {
          posterUrl = await uploadAllocinePosterToImageKit(movie)
        } catch (err) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          console.log(` - trying again...`)
          try {
            posterUrl = await uploadAllocinePosterToImageKit(movie)
          } catch (err) {}
        }

        if (posterUrl) {
          await prisma.movie.update({ where: { id: movie.id }, data: { posterUrl } })

          console.log(` - uploaded - ${posterUrl}`)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }
}

export async function scrapShowtimes(maxDay: number) {
  const foundShowtimeAllocineIds = new Set<number>()

  const [countCacheItemsBefore, countShowtimesBefore, countMoviesBefore, theaters] =
    await Promise.all([
      prisma.scrapedUrl.count({ where: { type: 'SHOWTIMES' } }),
      prisma.showtime.count(),
      prisma.movie.count(),
      prisma.theater.findMany(),
    ])

  await prisma.$transaction([
    prisma.showtime.deleteMany({
      where: { date: { lt: new Date() } },
    }),
    prisma.scrapedUrl.deleteMany({
      where: { expiresAt: { lt: new Date() }, type: 'SHOWTIMES' },
    }),
  ])

  const { successfulTheaterIds } = await scrapAllocineShowtimes(
    theaters,
    maxDay,
    foundShowtimeAllocineIds,
  )

  console.log(`Successfully scraped ${successfulTheaterIds.size}/${theaters.length} theaters`)

  // Only delete showtimes from theaters that were successfully scraped
  // This prevents data loss when some theaters fail to scrape
  const deletedShowtimes = await prisma.showtime.deleteMany({
    where: {
      allocineId: { notIn: [...foundShowtimeAllocineIds] },
      theaterId: { in: [...successfulTheaterIds] }, // Only delete from successfully scraped theaters
    },
  })

  const [countCacheItemsAfter, countShowtimesAfter, countMoviesAfter] = await Promise.all([
    prisma.scrapedUrl.count({ where: { type: 'SHOWTIMES' } }),
    prisma.showtime.count(),
    prisma.movie.count(),
  ])

  console.log(`CachedUrls: ${countCacheItemsBefore} -> ${countCacheItemsAfter}`)
  console.log(`Movies: ${countMoviesBefore} -> ${countMoviesAfter}`)
  console.log(`Showtimes: ${countShowtimesBefore} -> ${countShowtimesAfter}`)
  console.log(`Deleted ${deletedShowtimes.count} old showtimes from successfully scraped theaters`)
}

export async function scrapTicketing() {
  const countCacheItemsBefore = await prisma.scrapedUrl.count({ where: { type: 'TICKETING' } })
  await prisma.scrapedUrl.deleteMany({
    where: { expiresAt: { lt: new Date() }, type: 'TICKETING' },
  })

  await scrapAllocineTicketingUrl()

  const countCacheItemsAfter = await prisma.scrapedUrl.count({ where: { type: 'TICKETING' } })

  console.log(`CachedUrls: ${countCacheItemsBefore} -> ${countCacheItemsAfter}`)
}

export async function scrapPosters() {
  await scrapAllocinePosters()
}

export async function savePosterBlurHashes() {
  const movies = await prisma.movie.findMany({
    where: { posterUrl: { not: null }, posterBlurHash: null },
    select: { id: true, posterUrl: true },
    orderBy: { id: 'asc' },
  })

  for (const movie of movies) {
    try {
      const url = `${IMAGEKIT_URL}/${movie.posterUrl}/tr:w-310,q-50,ar-62-85`
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
