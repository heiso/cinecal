import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db.server'
import { getFilters, getWhereInputs } from '../filters.server'

function request(search: string) {
  return new Request(`http://localhost/${search}`)
}

function movieQuery(search: string) {
  const where = getWhereInputs(getFilters(request(search)))
  const { sql, params } = db.toSql(
    db.orm.public.Movie.where(where.movie).select('id').prepared.all().plan,
  )
  return {
    sql,
    params: params.map((param) => (param instanceof Date ? param.toISOString() : param)),
  }
}

describe('getFilters', () => {
  it('defaults to no filter', () => {
    expect(getFilters(request(''))).toEqual({
      title: null,
      date: 'DEFAULT',
      movieTags: [],
      showtimeTags: [],
      theaters: [],
      customTags: { NEW_RELEASE: false, NEXT_RELEASE: false, SCRAPED_RECENTLY: false },
      count: 0,
    })
  })

  it('parses and counts the search params, ignoring invalid values', () => {
    expect(
      getFilters(
        request(
          '?title=creed&date=TODAY&movieTags=1&movieTags=x&showtimeTags=2&theaters=3&theaters=4&customTags=NEW_RELEASE&customTags=NOPE',
        ),
      ),
    ).toEqual({
      title: 'creed',
      date: 'TODAY',
      movieTags: [1],
      showtimeTags: [2],
      theaters: [3, 4],
      customTags: { NEW_RELEASE: true, NEXT_RELEASE: false, SCRAPED_RECENTLY: false },
      count: 7,
    })
  })

  it('falls back to the default date filter', () => {
    expect(getFilters(request('?date=YESTERDAY')).date).toBe('DEFAULT')
  })
})

describe('getWhereInputs', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-09T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists movies with an upcoming showtime by default', () => {
    const { sql, params } = movieQuery('')
    expect(sql).toContain('"showtimes"."date" >= $1')
    expect(params).toEqual(['2026-11-09T12:00:00.000Z'])
  })

  it('limits showtimes to the rest of today (Europe/Paris)', () => {
    expect(movieQuery('?date=TODAY').params).toEqual([
      '2026-11-09T12:00:00.000Z',
      '2026-11-09T22:59:59.999Z',
    ])
  })

  it('limits showtimes to next week, monday to sunday', () => {
    const { sql, params } = movieQuery('?date=NEXT_WEEK')
    expect(sql).toContain('"showtimes"."date" > $1 AND "showtimes"."date" <= $2')
    expect(params).toEqual(['2026-11-15T23:00:00.000Z', '2026-11-22T22:59:59.999Z'])
  })

  it('matches the title literally and case-insensitively', () => {
    const { sql, params } = movieQuery('?title=50%25_off')
    expect(sql).toContain('"movies"."title" ILIKE $2')
    expect(params[1]).toBe('%50\\%\\_off%')
  })

  it('filters on theaters, tags and release dates', () => {
    const { sql, params } = movieQuery(
      '?theaters=2&showtimeTags=5&movieTags=3&customTags=NEW_RELEASE&customTags=SCRAPED_RECENTLY',
    )
    expect(sql).toContain('"showtimes"."theater_id" IN ($2)')
    expect(sql).toContain('"showtimes_showtime_tags"')
    expect(sql).toContain(
      '"movies"."release_date" >= $4::date AND "movies"."release_date" <= $5::date',
    )
    expect(sql).toContain('"movies"."created_at" >= $6')
    expect(sql).toContain('"movies_movie_tags"')
    expect(params).toEqual([
      '2026-11-09T12:00:00.000Z',
      2,
      5,
      '2026-10-26',
      '2026-11-09',
      '2026-11-08T23:00:00.000Z',
      3,
    ])
  })
})
