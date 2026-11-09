import { and, type ModelAccessor } from '@prisma/orm-postgres/orm-client'
import { add, endOfDay, endOfWeek, startOfDay, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Contract } from '../prisma/contract.d.ts'
import { CUSTOM_TAG, DATE_FILTER } from './filters'

type MovieFields = ModelAccessor<Contract, 'Movie', 'public'>
type ShowtimeFields = ModelAccessor<Contract, 'Showtime', 'public'>

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

  const count =
    Number(Boolean(title)) +
    Number(date !== DATE_FILTER.DEFAULT) +
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
  const nextWeek = add(now, { weeks: 1 })
  const recentReleaseDate = add(now, { days: -14 })

  const showtime = (s: ShowtimeFields) =>
    and(
      ...(filters.date === DATE_FILTER.TODAY
        ? [s.date.gte(now), s.date.lt(endOfDay(now))]
        : filters.date === DATE_FILTER.THIS_WEEK
          ? [s.date.gte(now), s.date.lt(endOfWeek(now, { locale: fr }))]
          : filters.date === DATE_FILTER.NEXT_WEEK
            ? [
                s.date.gt(startOfWeek(nextWeek, { locale: fr })),
                s.date.lte(endOfWeek(nextWeek, { locale: fr })),
              ]
            : [s.date.gte(now)]),
      ...(filters.theaters.length > 0 ? [s.theaterId.in(filters.theaters)] : []),
      ...(filters.showtimeTags.length > 0
        ? [s.Tags.some((tag) => tag.id.in(filters.showtimeTags))]
        : []),
    )

  const movie = (m: MovieFields) =>
    and(
      m.Showtimes.some(showtime),
      ...(filters.title ? [m.title.ilike(`%${escapeLike(filters.title)}%`)] : []),
      ...(filters.customTags.NEW_RELEASE && filters.customTags.NEXT_RELEASE
        ? [m.releaseDate.gte(recentReleaseDate)]
        : filters.customTags.NEW_RELEASE
          ? [m.releaseDate.gte(recentReleaseDate), m.releaseDate.lte(now)]
          : filters.customTags.NEXT_RELEASE
            ? [m.releaseDate.gt(now)]
            : []),
      ...(filters.customTags.SCRAPED_RECENTLY ? [m.createdAt.gte(startOfDay(now))] : []),
      ...(filters.movieTags.length > 0 ? [m.Tags.some((tag) => tag.id.in(filters.movieTags))] : []),
    )

  return { movie, showtime }
}
