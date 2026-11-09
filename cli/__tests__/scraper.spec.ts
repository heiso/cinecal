import { readFileSync } from 'node:fs'
import { format } from 'date-fns'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { paris } from '../../app/paris.ts'
import { allocineShowtimesHandler, theaterShowtimeId } from './allocine-mock.ts'

/**
 * Runs the showtimes scraper against the recorded Allocine responses and a
 * real database. It needs an empty, migrated database, which it truncates:
 *   createdb cinecal_test
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:5432/cinecal_test npm run db:migrate
 *   TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/cinecal_test npm test
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DATABASE_URL)('scrapShowtimes', () => {
  const server = setupServer(allocineShowtimesHandler())
  let requests = 0
  server.events.on('request:start', () => {
    requests++
  })

  let db: typeof import('../../prisma/db.ts').db
  let scrapShowtimes: typeof import('../scraper.ts').scrapShowtimes

  async function count(table: 'movies' | 'movie_tags' | 'showtimes' | 'scraped_urls') {
    const models = {
      movies: db.orm.public.Movie,
      movie_tags: db.orm.public.MovieTag,
      showtimes: db.orm.public.Showtime,
      scraped_urls: db.orm.public.ScrapedUrl,
    }
    const { count } = await models[table].aggregate((aggregate) => ({ count: aggregate.count() }))
    return count
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL!
    ;({ db } = await import('../../prisma/db.ts'))
    ;({ scrapShowtimes } = await import('../scraper.ts'))
    server.listen({ onUnhandledFrame: 'error' })
  })

  beforeEach(async () => {
    server.resetHandlers()
    requests = 0
    await db.execute(
      db.raw
        .sql`TRUNCATE movies, movie_tags, showtimes, showtime_tags, theaters, prices, scraped_urls, app_state RESTART IDENTITY CASCADE`
        .affectedCount()
        .build(),
    )
    await db.orm.public.Theater.createAndCount([
      {
        name: 'Le Brady',
        allocineId: 'C0023',
        address: 'Paris',
        website: 'https://www.lebrady.fr',
      },
      {
        name: 'Le Louxor',
        allocineId: 'W7510',
        address: 'Paris',
        website: 'https://www.cinemalouxor.fr',
      },
    ])
  })

  afterAll(async () => {
    server.close()
    await db?.close()
  })

  it('stores movies, tags and showtimes, then serves the next run from cache', async () => {
    await scrapShowtimes(2)

    // 2 theaters x (3 pages today + 3 pages tomorrow + 1 page the day after)
    expect(requests).toBe(14)
    expect(await count('scraped_urls')).toBe(14)
    const movies = await count('movies')
    expect(movies).toBeGreaterThan(0)
    expect(await count('movie_tags')).toBeGreaterThan(0)
    expect(await count('showtimes')).toBeGreaterThan(0)

    const appState = await db.orm.public.AppState.where({ id: 1 }).first()
    expect(appState?.lastCompleteScrapeAt).toBeInstanceOf(Date)

    const movie = await db.orm.public.Movie.where({ allocineId: 270743 })
      .include('Tags', (tags) => tags.select('name', 'category').orderBy((tag) => tag.name.asc()))
      .first()
    expect(movie).toMatchObject({
      title: 'Everything Everywhere All at Once',
      duration: 139,
      director: 'Daniel Scheinert, Daniel Kwan',
      Tags: expect.arrayContaining([{ name: 'Action', category: 'GENRE' }]),
    })

    // Allocine sends Paris wall clock times: stored showtimes are those instants, whatever the TZ
    const fixture = JSON.parse(
      readFileSync(`${import.meta.dirname}/fixtures/showtimes/theater-*.json`, 'utf8'),
    )
    const recorded = Object.values(fixture.results[0].showtimes).flat()[0] as {
      internalId: number
      startsAt: string
    }
    const showtime = await db.orm.public.Showtime.where({
      allocineId: theaterShowtimeId('C0023', recorded.internalId),
    })
      .select('date')
      .first()
    expect(showtime && format(showtime.date, "yyyy-MM-dd'T'HH:mm:ss", { in: paris })).toBe(
      `${format(new Date(), 'yyyy-MM-dd', { in: paris })}T${recorded.startsAt.slice(11)}`,
    )

    requests = 0
    await scrapShowtimes(2)
    expect(requests).toBe(0)
    expect(await count('movies')).toBe(movies)
  })

  it('stops early and keeps showtimes when Allocine rate limits the run', async () => {
    await scrapShowtimes(1)
    const showtimes = await db.orm.public.Showtime.where((showtime) =>
      showtime.date.gte(new Date()),
    )
      .select('id')
      .all()
    await db.orm.public.AppState.where({ id: 1 }).update({ lastCompleteScrapeAt: null })
    await db.execute(db.raw.sql`DELETE FROM scraped_urls`.affectedCount().build())

    server.use(
      http.post(
        'https://www.allocine.fr/_/showtimes/*',
        () => new HttpResponse(null, { status: 429 }),
      ),
    )
    await scrapShowtimes(1)

    expect(await count('showtimes')).toBe(showtimes.length)
    expect((await db.orm.public.AppState.where({ id: 1 }).first())?.lastCompleteScrapeAt).toBeNull()
  }, 10_000)
})
