import type { Scalars } from '@prisma/orm-postgres/family-contract/types'
import { and, not, or } from '@prisma/orm-postgres/orm-client'
import { getPixels } from '@unpic/pixels'
import { encode } from 'blurhash'
import { add, addDays, endOfDay, format, parseISO } from 'date-fns'
import { paris, toDate } from '../app/paris.ts'
import type { Models } from '../prisma/contract.d.ts'
import { db } from '../prisma/db.ts'
import type { AllocineResponse, Credit, Release } from './allocine-types.ts'

type Theater = Scalars<Models.public_Theater>
type TagCategory = Models.public_MovieTag['category']
type AllocineMovie = NonNullable<AllocineResponse['results'][number]['movie']>

const API_ENDPOINT = 'https://api.imagekit.io/v1/files'
const URL_ALLOCINE_SHOWTIMES = 'https://www.allocine.fr/_/showtimes'
// const URL_THEMOVIEDBID = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.THEMOVIEDBID_API_KEY}&language=fr-FR&query=`
// const URL_THEMOVIEDBID_PICTURES = `https://image.tmdb.org/t/p/original`
const EXCLUSION_LIST = ['Rex Studios', 'Sauvez le cinéma !']
const IMAGEKIT_FOLDER = process.env.ENV === 'development' ? 'posters-dev' : 'posters-prod'
const IMAGEKIT_URL = `https://ik.imagekit.io/cinecal/${IMAGEKIT_FOLDER}`
const POSTER_RATIO = 62 / 85
// Allocine's days are Paris days
const SHOWTIMES_EXPIRATION_DATE = toDate(endOfDay(new Date(), { in: paris }))
const TICKETING_DETAILS_EXPIRATION_DATE = toDate(add(new Date(), { days: 3 }, { in: paris }))
// Poster cleanup only trusts the showtime state if the last complete scrape is
// within this window. Showtimes run every 30min, so a healthy pipeline produces
// a complete run well within a day; if none has succeeded for this long, skip
// cleanup rather than risk deleting posters based on stale/partial data.
const POSTER_CLEANUP_MAX_AGE_HOURS = 24

const ALLOCINE_ORIGIN = 'https://www.allocine.fr'
// Allocine sits behind Cloudflare, which enforces a per-IP rolling request
// budget (~200-500 requests) and then serves 429 (`cf-mitigated: challenge`)
// for the rest of a ~5min window. This was verified empirically:
//  - the budget is per IP, not per session: a fresh __cf_bm/UA does NOT reset it
//  - request pacing does not change the budget, only how fast it is spent
//  - the window reliably resets after ~300s; requests during cooldown do not
//    extend it
// A full 90-day scrape (~1260 requests) blows through the budget, so instead of
// fighting it we lean on two things the pipeline already gives us:
//  1. The scrap job runs every 30min (see .github/workflows/scrap.yml), and the
//     showtimes cache lasts until end-of-day, so a run only fetches the URLs the
//     previous runs' budgets could not reach - cached URLs cost zero requests.
//  2. 429s are non-fatal per URL (the caller logs and moves on), so a run that
//     spends its budget simply skips the rest; the next run 30min later (a fresh
//     budget window) fills the gaps. Over a few runs the whole range converges.
// Given that, on a 429 we retry once quickly (for transient blips) and then give
// up on that URL fast rather than burning minutes in backoff.
const ALLOCINE_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const ALLOCINE_MAX_RETRIES = 1
const ALLOCINE_RETRY_DELAY_MS = 2000

// Thrown when Allocine returns 429 after retries, i.e. the per-IP request budget
// is spent. It aborts the current run: there is no point hammering the remaining
// ~1000 URLs (they will all 429 for ~5min), and it also marks the run as
// incomplete so the poster cleanup knows not to trust the showtime state.
class RateLimitError extends Error {
  constructor(url: string) {
    super(`Rate limited (429): ${url}`)
    this.name = 'RateLimitError'
  }
}

async function allocineFetch(url: string, init: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: {
        'User-Agent': ALLOCINE_USER_AGENT,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        Referer: `${ALLOCINE_ORIGIN}/`,
        ...init.headers,
      },
    })

    if ((res.status === 429 || res.status === 503) && attempt < ALLOCINE_MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, ALLOCINE_RETRY_DELAY_MS))
      continue
    }

    return res
  }
}

function getUniqueAllocineShowtimes(showtimes: AllocineResponse['results'][0]['showtimes']) {
  const showtimesArray = Object.values(showtimes).flat()

  return showtimesArray.reduce<typeof showtimesArray>((acc, showtime) => {
    if (!acc.find(({ internalId }) => internalId === showtime.internalId)) {
      acc.push(showtime)
    }
    return acc
  }, [])
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  )
}

function getDuration(runtime: number | string) {
  if (typeof runtime === 'string') {
    const [hours = '', minutes = ''] = runtime.split('h')
    return parseInt(hours) * 60 + parseInt(minutes) || 0
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

function getDirector(credits: Credit[]): string | null {
  const directors = credits
    .filter((credit) => credit.position?.name === 'DIRECTOR')
    .map(({ person }) => [person?.firstName, person?.lastName].filter(Boolean).join(' '))
    .filter(Boolean)

  return directors.length > 0 ? directors.join(', ') : null
}

function getCachedUrl(url: string) {
  return db.orm.public.ScrapedUrl.where((scrapedUrl) =>
    and(scrapedUrl.url.eq(url), scrapedUrl.expiresAt.gte(new Date())),
  )
    .select('content')
    .first()
}

async function getAllocineTicketingDetails(url: string) {
  const cached = await getCachedUrl(url)

  if (cached) {
    console.log(`${url} - cached`)
    return cached.content
  }

  console.log(url)

  const res = await allocineFetch(url)

  if (!res.ok) {
    throw new Error(`${url} - error HTTP ${res.status}`)
  }

  const content = await res.text()

  await db.orm.public.ScrapedUrl.upsert({
    create: { url, content, expiresAt: TICKETING_DETAILS_EXPIRATION_DATE, type: 'TICKETING' },
    update: { content, expiresAt: TICKETING_DETAILS_EXPIRATION_DATE },
  })

  return content
}

async function getAllocineShowtimes(url: string) {
  const cached = await getCachedUrl(url)

  if (cached) {
    console.log(`${url} - cached`)
    return { json: JSON.parse(cached.content) as unknown as AllocineResponse, fromCache: true }
  }

  console.log(url)

  const res = await allocineFetch(url, {
    method: 'post',
  })

  if (res.status === 429) {
    throw new RateLimitError(url)
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const content = await res.text()
  const json = JSON.parse(content) as AllocineResponse

  if (json.error) {
    if (json.message === 'no.showtime.error') {
      // Cache the empty result too: a day with no showtimes should not be
      // re-fetched on every run. Not caching it wasted ~280 of the ~1260
      // requests in a 90-day run (far-future empty days), eating into the
      // per-IP request budget for nothing.
      console.log(`${url} - no showtimes found`)
    } else {
      // Other errors are transient/unexpected: do not cache, so the next run
      // retries them.
      console.error(`${url} - error ${json.message || 'Unknown error'}`)
      return { json, fromCache: false }
    }
  }

  await db.orm.public.ScrapedUrl.upsert({
    create: { url, content, expiresAt: SHOWTIMES_EXPIRATION_DATE, type: 'SHOWTIMES' },
    update: { content, expiresAt: SHOWTIMES_EXPIRATION_DATE },
  })

  return { json, fromCache: false }
}

function getMovieTags(movie: AllocineMovie) {
  const tags: { name: string; category: TagCategory }[] = []

  for (const { name, tags: types } of movie.relatedTags) {
    const resolvedName = typeof name === 'string' ? name : name.translate
    if (types.list.find((type) => 'Tag.Type.SubGenre' === type)) {
      tags.push({ name: resolvedName, category: 'SUB_GENRE' })
    } else if (types.list.find((type) => 'Tag.Type.Characteristic' === type)) {
      tags.push({ name: resolvedName, category: 'CHARACTERISTIC' })
    }
  }

  for (const name of movie.genres) {
    tags.push({ name: typeof name === 'string' ? name : name.translate, category: 'GENRE' })
  }

  return tags
}

/**
 * Returns the movie with this Allocine id, creating it (and connecting its
 * tags, creating the missing ones) when it does not exist yet. An existing
 * movie is left untouched.
 */
async function findOrCreateMovie(movie: AllocineMovie) {
  const director = getDirector(movie.credits)
  const existing = await db.orm.public.Movie.where({ allocineId: movie.internalId })
    .select('id', 'director')
    .first()

  if (existing) {
    // Movies scraped while the director was not parsed get it on their next scrape
    if (existing.director === null && director !== null) {
      await db.orm.public.Movie.where({ id: existing.id }).updateAndCount({ director })
    }
    return { id: existing.id }
  }

  const tagIds = new Set<number>()
  for (const { name, category } of getMovieTags(movie)) {
    const tag =
      (await db.orm.public.MovieTag.where({ name }).select('id').first()) ??
      (await db.orm.public.MovieTag.select('id').create({ name, category }))
    tagIds.add(tag.id)
  }

  return db.orm.public.Movie.select('id').create({
    originalTitle: movie.originalTitle,
    title: movie.title,
    duration: getDuration(movie.runtime),
    synopsis: movie.synopsis,
    releaseDate: getReleaseDate(movie.releases),
    allocineId: movie.internalId,
    posterAllocineUrl: movie.poster?.url,
    director,
    ...(tagIds.size > 0 && {
      Tags: (tags) => tags.connect([...tagIds].map((id) => ({ id }))),
    }),
  })
}

async function scrapAllocineShowtimes(
  theaters: Theater[],
  maxDay: number,
  foundShowtimeAllocineIds: Set<number>,
  successfulTheaterIds: Set<number> = new Set(),
  theaterIndex: number = 0,
  day: number = 0,
  page: number = 1,
): Promise<{ successfulTheaterIds: Set<number> }> {
  const theater = theaters[theaterIndex]
  if (!theater) return { successfulTheaterIds }
  const pageParam = page > 1 ? `p-${page}/` : ''
  const dayParam =
    day > 0
      ? `d-${format(addDays(new Date(), day, { in: paris }), 'yyyy-MM-dd', { in: paris })}/`
      : ''
  const url = `${URL_ALLOCINE_SHOWTIMES}/theater-${theater.allocineId}/${dayParam}${pageParam}`

  try {
    const result = await getAllocineShowtimes(url)

    if (!result) {
      console.error(
        `${theater.name} (${theater.allocineId}) - day ${day} page ${page} - API call failed, skipping`,
      )
      // Continue to next iteration without processing this failed call
    } else {
      const { json: body, fromCache } = result

      // Mark theater as having at least one successful API call
      successfulTheaterIds.add(theater.id)

      console.log(
        `${theater.name} (${theater.allocineId}) - day ${day} page ${page} - found ${body.results.length} movies${fromCache ? ' (cached)' : ''}`,
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

          // On a cache hit the movies/showtimes were already persisted when the
          // URL was first fetched, so skip the (expensive) DB writes. We still
          // record the showtime ids so the prune step below does not delete
          // showtimes that are simply being served from cache this run.
          if (fromCache) {
            getUniqueAllocineShowtimes(result.showtimes).forEach((showtime) =>
              foundShowtimeAllocineIds.add(showtime.internalId),
            )
            continue
          }

          const movie = await findOrCreateMovie(result.movie)

          const data = getUniqueAllocineShowtimes(result.showtimes).map((showtime) => ({
            allocineId: showtime.internalId,
            // startsAt is a Paris wall clock time without offset
            date: toDate(parseISO(showtime.startsAt, { in: paris })),
            isPreview: showtime.isPreview,
            language: showtime.tags.includes('Localization.Language.French')
              ? ('VF' as const)
              : ('VO' as const),
            ticketingUrl: showtime.data.ticketing?.[0]?.urls[0],
            theaterId: theater.id,
            movieId: movie.id,
          }))

          if (data.length > 0) {
            await db.orm.public.Showtime.createAndCount(data, { onConflict: 'skip' })
          }

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
        )
      }
    }
  } catch (err) {
    // A 429 means the per-IP budget is spent: abort the whole run rather than
    // hammering the remaining URLs. The next scheduled run resumes from cache.
    if (err instanceof RateLimitError) {
      throw err
    }
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
    )
  }

  return { successfulTheaterIds }
}

async function scrapAllocineTicketingUrl(): Promise<void> {
  const movieTags = await db.orm.public.MovieTag.where((tag) => tag.regExp.isNotNull())
    .select('id', 'regExp')
    .all()
  const showtimeTags = await db.orm.public.ShowtimeTag.where((tag) => tag.regExp.isNotNull())
    .select('id', 'regExp')
    .all()

  const showtimes = await db.orm.public.Showtime.where((showtime) =>
    showtime.ticketingUrl.isNotNull(),
  )
    .select('id', 'movieId', 'ticketingUrl')
    .all()

  const matchingTags = (tags: { id: number; regExp: string | null }[], details: string) =>
    tags.filter(({ regExp }) => regExp && new RegExp(regExp, 'i').test(details))

  const decodeEntities = (text: string) =>
    text
      .replace(/&#128;/g, '€')
      .replace(/&#(\d+);/g, (_entity, charCode: string) => String.fromCharCode(Number(charCode)))

  for (const { id, movieId, ticketingUrl } of showtimes) {
    if (!ticketingUrl) continue
    try {
      const details = await getAllocineTicketingDetails(ticketingUrl)

      const regx =
        /<p>([^<]*)(?:<a[^<]*title="([^<]*)"[^<]*>i<\/a>)?<span[^<]*[^>]*>(\d*.\d*) &euro;/g
      const prices = [...details.matchAll(regx)].map(([, label = '', description, price = '']) => ({
        label: decodeEntities(label),
        description: description === undefined ? null : decodeEntities(description),
        price: parseInt(price),
      }))

      const movieTagLinks = matchingTags(movieTags, details).map((tag) => ({
        movieId,
        tagId: tag.id,
      }))
      if (movieTagLinks.length > 0) {
        await db.orm.public.MovieToMovieTag.createAndCount(movieTagLinks, { onConflict: 'skip' })
      }

      const oldPrices = await db.orm.public.Price.where({ showtimeId: id }).select('id').all()

      const showtimeTagLinks = matchingTags(showtimeTags, details).map((tag) => ({
        showtimeId: id,
        tagId: tag.id,
      }))
      if (showtimeTagLinks.length > 0) {
        await db.orm.public.ShowtimeToShowtimeTag.createAndCount(showtimeTagLinks, {
          onConflict: 'skip',
        })
      }

      if (prices.length > 0) {
        await db.orm.public.Price.createAndCount(
          prices.map((price) => ({ ...price, showtimeId: id })),
        )
      }

      if (oldPrices.length > 0) {
        await db.orm.public.Price.where((price) =>
          price.id.in(oldPrices.map(({ id }) => id)),
        ).deleteAndCount()
      }
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

type UploadedPoster = {
  fileId: string
  filePath: string
  name: string
  url: string
  customMetadata: CustomMetadata
}

const IMAGEKIT_MAX_RETRIES = 3
const IMAGEKIT_RETRY_DELAY_MS = 2000

function imagekitAuthHeader() {
  return `Basic ${Buffer.from(process.env.IMAGEKIT_API_KEY + ':').toString('base64')}`
}

// Wraps fetch for the ImageKit API with retries. The self-hosted runner
// occasionally hits transient network failures (e.g. DNS ENOTFOUND on
// api.imagekit.io) which throw from fetch and would otherwise crash the whole
// scrap step; retryable HTTP statuses (429 / 5xx) are retried too.
async function imagekitFetch(url: string | URL, init: RequestInit = {}): Promise<Response> {
  let lastErr: unknown

  for (let attempt = 0; attempt <= IMAGEKIT_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, IMAGEKIT_RETRY_DELAY_MS * attempt))
    }

    try {
      const response = await fetch(url, {
        ...init,
        headers: { Authorization: imagekitAuthHeader(), ...init.headers },
      })

      if (response.status === 429 || response.status >= 500) {
        lastErr = new Error(`ImageKit HTTP ${response.status}`)
        console.warn(
          `${url} - ${response.status}, retrying (attempt ${attempt + 1}/${IMAGEKIT_MAX_RETRIES})`,
        )
        continue
      }

      return response
    } catch (err) {
      // Network-level failure (DNS, connection reset, ...) - fetch throws.
      lastErr = err
      console.warn(
        `${url} - network error, retrying (attempt ${attempt + 1}/${IMAGEKIT_MAX_RETRIES})`,
        err instanceof Error ? err.message : err,
      )
    }
  }

  throw lastErr
}

async function getUploadedPosterList(movieIds: number[]): Promise<UploadedPoster[]> {
  const movieIdsByPacks = chunk(movieIds, 500)

  const moviePosters: UploadedPoster[] = []

  for (const ids of movieIdsByPacks) {
    const url = new URL(API_ENDPOINT)
    url.searchParams.append('path', IMAGEKIT_FOLDER)
    url.searchParams.append('type', 'file')
    url.searchParams.append('fileType', 'image')
    url.searchParams.append('searchQuery', `"customMetadata.id" in [${ids.join(',')}]`)

    const response = await imagekitFetch(url, { method: 'GET' })

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
      ) as UploadedPoster[]),
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

  const response = await imagekitFetch(`${API_ENDPOINT}/upload`, {
    method: 'POST',
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

async function getAllUploadedPosters(): Promise<UploadedPoster[]> {
  const LIMIT = 1000 // ImageKit max page size
  const posters: UploadedPoster[] = []

  for (let skip = 0; ; skip += LIMIT) {
    const url = new URL(API_ENDPOINT)
    url.searchParams.append('path', IMAGEKIT_FOLDER)
    url.searchParams.append('type', 'file')
    url.searchParams.append('fileType', 'image')
    url.searchParams.append('limit', LIMIT.toString())
    url.searchParams.append('skip', skip.toString())

    const response = await imagekitFetch(url, { method: 'GET' })

    if (!response.ok) {
      throw new Error(response.statusText)
    }

    const body = await response.json()

    if (!Array.isArray(body)) {
      console.error(body)
      throw new Error('body should be an array')
    }

    posters.push(...(body as UploadedPoster[]))

    if (body.length < LIMIT) {
      break
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return posters
}

async function deletePostersFromImageKit(fileIds: string[]) {
  // ImageKit bulk delete is capped at 100 fileIds per call
  const fileIdsByPacks = chunk(fileIds, 100)

  for (const ids of fileIdsByPacks) {
    const response = await imagekitFetch(`${API_ENDPOINT}/batch/deleteByFileIds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileIds: ids }),
    })

    if (!response.ok) {
      console.error(response.status, response.statusText)
      console.error(await response.text())
      throw new Error(response.statusText)
    }

    console.log(`Deleted ${ids.length} unused posters from ImageKit`)

    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

async function deleteUnusedPosters() {
  // A poster is "in use" only if it belongs to a movie that still has at least
  // one showtime. Movies are never deleted and posterUrl is never cleared, so
  // keying on `posterUrl != null` would keep every poster forever and the
  // ImageKit folder would grow without bound. Past showtimes are pruned earlier
  // in the run, so "has a showtime" effectively means "has an upcoming showtime".
  const moviesWithShowtime = await db.orm.public.Movie.where((movie) =>
    and(movie.posterUrl.isNotNull(), movie.Showtimes.some()),
  )
    .select('posterUrl')
    .all()
  const usedPosterNames = new Set(moviesWithShowtime.map((movie) => movie.posterUrl))

  const uploadedPosters = await getAllUploadedPosters()
  const unusedPosterFileIds = uploadedPosters
    .filter((poster) => !usedPosterNames.has(poster.name))
    .map((poster) => poster.fileId)

  console.log(
    `ImageKit posters: ${uploadedPosters.length} total, ${unusedPosterFileIds.length} unused`,
  )

  if (unusedPosterFileIds.length > 0) {
    await deletePostersFromImageKit(unusedPosterFileIds)
  }
}

async function scrapAllocinePosters() {
  // Remove posters of movies that no longer have showtimes - but ONLY if the
  // last showtimes scrape completed without being cut short by rate limiting.
  // On a partial run a movie's showtimes can be temporarily missing, and
  // deleting its poster then would just force a re-upload next run (churn, and
  // risk when storage is full). Cleanup runs first so ImageKit has room for the
  // uploads below. Best-effort: a transient failure still lets uploads proceed.
  const appState = await db.orm.public.AppState.where({ id: 1 }).first()
  const lastComplete = appState?.lastCompleteScrapeAt
  const scrapeIsFresh =
    lastComplete != null &&
    lastComplete >= add(new Date(), { hours: -POSTER_CLEANUP_MAX_AGE_HOURS })

  if (scrapeIsFresh) {
    try {
      await deleteUnusedPosters()
    } catch (err) {
      console.error('deleteUnusedPosters failed, continuing to uploads', err)
    }
  } else {
    console.log(
      `Skipping poster cleanup: last complete scrape is ${
        lastComplete ? 'too old' : 'unknown'
      } (${lastComplete?.toISOString() ?? 'never'})`,
    )
  }

  // Only upload posters for movies that currently have a showtime: those are
  // the only ones displayed, and it keeps the ImageKit folder from filling up
  // with posters for movies no longer playing.
  const movies = await db.orm.public.Movie.where((movie) =>
    and(movie.posterAllocineUrl.isNotNull(), movie.Showtimes.some()),
  )
    .select('id', 'originalTitle', 'posterAllocineUrl')
    .orderBy((movie) => movie.id.desc())
    .all()

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
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          console.log(` - trying again...`)
          try {
            posterUrl = await uploadAllocinePosterToImageKit(movie)
          } catch {}
        }

        if (posterUrl) {
          await db.orm.public.Movie.where({ id: movie.id }).update({ posterUrl })

          console.log(` - uploaded - ${posterUrl}`)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }
}

async function countScrapedUrls(type: 'SHOWTIMES' | 'TICKETING') {
  const { count } = await db.orm.public.ScrapedUrl.where({ type }).aggregate((aggregate) => ({
    count: aggregate.count(),
  }))
  return count
}

async function countShowtimes() {
  const { count } = await db.orm.public.Showtime.aggregate((aggregate) => ({
    count: aggregate.count(),
  }))
  return count
}

async function countMovies() {
  const { count } = await db.orm.public.Movie.aggregate((aggregate) => ({
    count: aggregate.count(),
  }))
  return count
}

export async function scrapShowtimes(maxDay: number) {
  const foundShowtimeAllocineIds = new Set<number>()

  const [countCacheItemsBefore, countShowtimesBefore, countMoviesBefore, theaters] =
    await Promise.all([
      countScrapedUrls('SHOWTIMES'),
      countShowtimes(),
      countMovies(),
      db.orm.public.Theater.orderBy((theater) => theater.id.asc()).all(),
    ])

  const now = new Date()
  await db.transaction(async (tx) => {
    await tx.orm.public.Showtime.where((showtime) => showtime.date.lt(now)).deleteAndCount()
    await tx.orm.public.ScrapedUrl.where((scrapedUrl) =>
      and(scrapedUrl.expiresAt.lt(now), scrapedUrl.type.eq('SHOWTIMES')),
    ).deleteAndCount()
  })

  let complete = true
  let successfulTheaterIds = new Set<number>()
  try {
    ;({ successfulTheaterIds } = await scrapAllocineShowtimes(
      theaters,
      maxDay,
      foundShowtimeAllocineIds,
    ))
  } catch (err) {
    // A 429 aborts the run partway: we have valid data for the theaters/days
    // scraped so far (persisted as we went), but the run is incomplete.
    if (err instanceof RateLimitError) {
      complete = false
      console.warn(`Rate limited - stopping run early. ${err.message}`)
    } else {
      throw err
    }
  }

  console.log(
    `Scraped ${successfulTheaterIds.size}/${theaters.length} theaters (${
      complete ? 'complete' : 'incomplete - rate limited'
    })`,
  )

  // Prune showtimes that were not found again ONLY on a complete run. On a
  // partial (rate-limited) run, a theater's later days may simply not have been
  // reached, so their showtimes are missing from foundShowtimeAllocineIds -
  // pruning then would delete valid future showtimes. Skipping the prune on
  // incomplete runs prevents that data loss.
  let deletedShowtimes = 0
  if (complete) {
    if (successfulTheaterIds.size > 0) {
      const foundIds = [...foundShowtimeAllocineIds]
      deletedShowtimes = await db.orm.public.Showtime.where((showtime) =>
        and(
          showtime.theaterId.in([...successfulTheaterIds]),
          ...(foundIds.length > 0 ? [not(showtime.allocineId.in(foundIds))] : []),
        ),
      ).deleteAndCount()
    }

    // Record that showtime state is trustworthy right now, so the poster
    // cleanup (a separate job) knows it can safely delete posters for movies
    // that have no showtimes.
    await db.orm.public.AppState.upsert({
      create: { id: 1, lastCompleteScrapeAt: new Date() },
      update: { lastCompleteScrapeAt: new Date() },
    })
  }

  const [countCacheItemsAfter, countShowtimesAfter, countMoviesAfter] = await Promise.all([
    countScrapedUrls('SHOWTIMES'),
    countShowtimes(),
    countMovies(),
  ])

  console.log(`CachedUrls: ${countCacheItemsBefore} -> ${countCacheItemsAfter}`)
  console.log(`Movies: ${countMoviesBefore} -> ${countMoviesAfter}`)
  console.log(`Showtimes: ${countShowtimesBefore} -> ${countShowtimesAfter}`)
  console.log(
    `Deleted ${deletedShowtimes} old showtimes${complete ? '' : ' (skipped - incomplete run)'}`,
  )
}

export async function scrapTicketing() {
  const countCacheItemsBefore = await countScrapedUrls('TICKETING')
  const now = new Date()
  await db.orm.public.ScrapedUrl.where((scrapedUrl) =>
    and(scrapedUrl.expiresAt.lt(now), scrapedUrl.type.eq('TICKETING')),
  ).deleteAndCount()

  await scrapAllocineTicketingUrl()

  const countCacheItemsAfter = await countScrapedUrls('TICKETING')

  console.log(`CachedUrls: ${countCacheItemsBefore} -> ${countCacheItemsAfter}`)
}

export async function scrapPosters() {
  await scrapAllocinePosters()
}

export async function savePosterBlurHashes() {
  const movies = await db.orm.public.Movie.where((movie) =>
    and(
      or(movie.posterUrl.isNotNull(), movie.posterAllocineUrl.isNotNull()),
      movie.posterBlurHash.isNull(),
    ),
  )
    .select('id', 'posterUrl', 'posterAllocineUrl')
    .orderBy((movie) => movie.id.asc())
    .all()

  for (const movie of movies) {
    try {
      const url = movie.posterUrl
        ? `${IMAGEKIT_URL}/${movie.posterUrl}/tr:w-310,q-50,ar-62-85`
        : (movie.posterAllocineUrl ?? '')
      const pixels = await getPixels(url)
      const data = Uint8ClampedArray.from(pixels.data)
      const blurHash = encode(data, pixels.width, pixels.height, Math.round(9 * POSTER_RATIO), 9)

      console.log(`${url} -> ${blurHash}`)

      await db.orm.public.Movie.where({ id: movie.id }).update({ posterBlurHash: blurHash })
    } catch (err) {
      console.error(err)
    }
  }
}
