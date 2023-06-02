import { Prisma } from '@prisma/client'
import { LoaderArgs } from '@remix-run/node'
import { add, endOfDay, endOfWeek, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CUSTOM_TAG, DATE_FILTER } from './filters'

export function getFilters(request: LoaderArgs['request']) {
  const url = new URL(request.url)
  const search = new URLSearchParams(url.search)
  const searchDateParam = search.get('date')

  const title = search.get('title') || null
  const date =
    searchDateParam && searchDateParam in DATE_FILTER
      ? (searchDateParam as DATE_FILTER)
      : DATE_FILTER.DEFAULT
  const tags = search
    .getAll('tags')
    .map((value) => parseInt(value))
    .filter((value) => !isNaN(value))
  const theaters = search
    .getAll('theaters')
    .map((value) => parseInt(value))
    .filter((value) => !isNaN(value))
  const customTags = search
    .getAll('customTags')
    .filter((value) => value in CUSTOM_TAG) as CUSTOM_TAG[]

  let count =
    Number(Boolean(title)) +
    Number(date !== DATE_FILTER.DEFAULT) +
    tags.length +
    theaters.length +
    customTags.length

  return {
    title,
    date,
    tags,
    theaters,
    customTags: (Object.keys(CUSTOM_TAG) as CUSTOM_TAG[]).reduce<Record<CUSTOM_TAG, Boolean>>(
      (acc, key) => {
        acc[key] = Boolean(customTags.find((tag) => key === tag))
        return acc
      },
      {} as Record<CUSTOM_TAG, Boolean>
    ),
    count,
  }
}

export function getWhereInputs(filters: ReturnType<typeof getFilters>): {
  showtimeWhereInput: Prisma.ShowtimeWhereInput
  movieWhereInput: Prisma.MovieWhereInput
} {
  const now = new Date()

  const whereDate =
    filters.date === DATE_FILTER.TODAY
      ? { date: { gte: now, lt: endOfDay(now) } }
      : filters.date === DATE_FILTER.THIS_WEEK
      ? { date: { gte: now, lt: endOfWeek(now, { locale: fr }) } }
      : filters.date === DATE_FILTER.NEXT_WEEK
      ? {
          date: {
            gt: startOfWeek(add(now, { weeks: 1 }), { locale: fr }),
            lte: endOfWeek(add(now, { weeks: 1 }), { locale: fr }),
          },
        }
      : { date: { gte: now } }

  const whereReleaseDate =
    filters.customTags.NEW_RELEASE && filters.customTags.NEXT_RELEASE
      ? { releaseDate: { gte: add(now, { days: -14 }) } }
      : filters.customTags.NEW_RELEASE
      ? { releaseDate: { gte: add(now, { days: -14 }), lte: now } }
      : filters.customTags.NEXT_RELEASE
      ? { releaseDate: { gt: now } }
      : {}

  return {
    movieWhereInput: {
      ...(filters.title && { title: { contains: filters.title, mode: 'insensitive' } }),
      ...whereReleaseDate,
      ...(filters.tags.length > 0 && {
        Tags: {
          some: { id: { in: filters.tags } },
        },
      }),
    },

    showtimeWhereInput: {
      ...whereDate,
      ...(filters.theaters.length > 0 && {
        theaterId: { in: filters.theaters },
      }),
      ...(filters.tags.length > 0 && {
        Tags: {
          some: { id: { in: filters.tags } },
        },
      }),
    },
  }
}
