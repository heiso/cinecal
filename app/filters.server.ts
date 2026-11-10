import { and, type ModelAccessor, type ModelCallbackTools } from '@prisma/orm-postgres/orm-client'
import { add, endOfDay, endOfWeek, format, startOfDay, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Contract } from '../src/prisma/contract.d'
import { CUSTOM_TAG, DATE_FILTER } from './filters'

type MovieFields = ModelAccessor<Contract, 'Movie', 'public'>
type ShowtimeFields = ModelAccessor<Contract, 'Showtime', 'public'>
type ShowtimeTools = ModelCallbackTools<Contract, 'Showtime', 'public'>

/** The server's time zone (Europe/Paris in production), the one the date filters use too */
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

/** A showtime on Saturday or Sunday, or from 18:00 on a weekday */
function afterWork(s: ShowtimeFields, fns: ShowtimeTools['fns']) {
  const weekend = fns.raw`EXTRACT(ISODOW FROM ${s.date} AT TIME ZONE ${timeZone}) >= 6`
  const evening = fns.raw`EXTRACT(HOUR FROM ${s.date} AT TIME ZONE ${timeZone}) >= 18`
  return fns.or(weekend.returns('pg/bool@1'), evening.returns('pg/bool@1'))
}

export type Filters = ReturnType<typeof getFilters>

function isDateFilter(value: string): value is DATE_FILTER {
  return value in DATE_FILTER
}

function isCustomTag(value: string): value is CUSTOM_TAG {
  return value in CUSTOM_TAG
}

function getIds(search: URLSearchParams, name: string) {
  return search
    .getAll(name)
    .map((value) => parseInt(value))
    .filter((value) => !isNaN(value))
}

export function getFilters(request: Request) {
  const search = new URL(request.url).searchParams
  const searchDateParam = search.get('date')

  const title = search.get('title') || null
  const date =
    searchDateParam && isDateFilter(searchDateParam) ? searchDateParam : DATE_FILTER.DEFAULT
  const movieTags = getIds(search, 'movieTags')
  const showtimeTags = getIds(search, 'showtimeTags')
  const theaters = getIds(search, 'theaters')
  const customTags = search.getAll('customTags').filter(isCustomTag)
  const afterWork = search.has('afterWork')

  const count =
    Number(Boolean(title)) +
    Number(date !== DATE_FILTER.DEFAULT) +
    Number(afterWork) +
    movieTags.length +
    showtimeTags.length +
    theaters.length +
    customTags.length

  return {
    title,
    date,
    movieTags,
    showtimeTags,
    theaters,
    afterWork,
    customTags: Object.fromEntries(
      Object.values(CUSTOM_TAG).map((tag) => [tag, customTags.includes(tag)]),
    ) as Record<CUSTOM_TAG, boolean>,
    count,
  }
}

/** Escape the LIKE wildcards so a title is matched literally, like Prisma's `contains` did. */
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&')
}

/**
 * Builds the filter predicates for a movie and for its showtimes. A movie is
 * listed when it matches `movie` and has at least one showtime matching `showtime`.
 */
export function getWhereInputs(filters: Filters) {
  const now = new Date()
  // Release dates are calendar dates ("yyyy-MM-dd")
  const today = format(now, 'yyyy-MM-dd')
  const recentReleaseDate = format(add(now, { days: -14 }), 'yyyy-MM-dd')
  const startOfToday = startOfDay(now)
  const endOfToday = endOfDay(now)
  const endOfThisWeek = endOfWeek(now, { locale: fr })
  const nextWeek = add(now, { weeks: 1 })
  const startOfNextWeek = startOfWeek(nextWeek, { locale: fr })
  const endOfNextWeek = endOfWeek(nextWeek, { locale: fr })

  const showtime = (s: ShowtimeFields, { fns }: ShowtimeTools) =>
    and(
      ...(filters.date === DATE_FILTER.TODAY
        ? [s.date.gte(now), s.date.lt(endOfToday)]
        : filters.date === DATE_FILTER.THIS_WEEK
          ? [s.date.gte(now), s.date.lt(endOfThisWeek)]
          : filters.date === DATE_FILTER.NEXT_WEEK
            ? [s.date.gt(startOfNextWeek), s.date.lte(endOfNextWeek)]
            : [s.date.gte(now)]),
      ...(filters.theaters.length > 0 ? [s.theaterId.in(filters.theaters)] : []),
      ...(filters.showtimeTags.length > 0
        ? [s.Tags.some((tag) => tag.id.in(filters.showtimeTags))]
        : []),
      ...(filters.afterWork ? [afterWork(s, fns)] : []),
    )

  const movie = (m: MovieFields) =>
    and(
      m.Showtimes.some(showtime),
      ...(filters.title ? [m.title.ilike(`%${escapeLike(filters.title)}%`)] : []),
      ...(filters.customTags.NEW_RELEASE && filters.customTags.NEXT_RELEASE
        ? [m.releaseDate.gte(recentReleaseDate)]
        : filters.customTags.NEW_RELEASE
          ? [m.releaseDate.gte(recentReleaseDate), m.releaseDate.lte(today)]
          : filters.customTags.NEXT_RELEASE
            ? [m.releaseDate.gt(today)]
            : []),
      ...(filters.customTags.SCRAPED_RECENTLY ? [m.createdAt.gte(startOfToday)] : []),
      ...(filters.movieTags.length > 0 ? [m.Tags.some((tag) => tag.id.in(filters.movieTags))] : []),
    )

  return { movie, showtime }
}
