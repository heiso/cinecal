import { Prisma } from '@prisma/client'
import { LoaderArgs, json } from '@remix-run/node'
import {
  Form,
  Link,
  useLoaderData,
  useLocation,
  useNavigation,
  useSearchParams,
  useSubmit,
} from '@remix-run/react'
import { add, endOfDay, endOfWeek, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { Context } from '../../core/context'
import { DATE_FILTER } from './movies'

export const loader = async ({ context, params, request }: LoaderArgs) => {
  const ctx = context as unknown as Context

  const url = new URL(request.url)
  const search = new URLSearchParams(url.search)
  const filters = {
    title: search.get('title'),
    date: search.get('date'),
    tags: search.getAll('tags').map((id) => parseInt(id)),
    theaters: search.getAll('theaters').map((id) => parseInt(id)),
  }

  if (
    (filters.date && !DATE_FILTER[filters.date as DATE_FILTER]) ||
    (filters.theaters && filters.theaters.some((id) => isNaN(Number(id))))
  ) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
  }

  const now = new Date()

  const dateFilter: Prisma.ShowtimeWhereInput = (() => {
    switch (filters.date) {
      case DATE_FILTER.TODAY: {
        return { date: { gte: now, lt: endOfDay(now) } }
      }

      case DATE_FILTER.THIS_WEEK: {
        return { date: { gte: now, lt: endOfWeek(now, { locale: fr }) } }
      }

      case DATE_FILTER.NEXT_WEEK: {
        return {
          date: {
            gt: startOfWeek(add(now, { weeks: 1 }), { locale: fr }),
            lte: endOfWeek(add(now, { weeks: 1 }), { locale: fr }),
          },
        }
      }

      case DATE_FILTER.DEFAULT:
      default: {
        return { date: { gte: now } }
      }
    }
  })()

  const resultCount = await ctx.prisma.movie.count({
    where: {
      ...(filters.title && { title: { contains: filters.title, mode: 'insensitive' } }),
      Showtimes: {
        some: {
          ...dateFilter,
          ...(filters.theaters.length > 0 && {
            theaterId: { in: filters.theaters },
          }),
          ...(filters.tags.length > 0 && {
            Tags: {
              some: { id: { in: filters.tags } },
            },
          }),
        },
      },
    },
  })

  return json({
    tags: await ctx.prisma.tag.findMany({
      where: { Showtimes: { some: { date: { gte: now } } } },
      select: { id: true, name: true },
    }),

    theaters: await ctx.prisma.theater.findMany({
      where: { Showtimes: { some: { date: { gte: now } } } },
      select: { id: true, name: true },
    }),

    resultCount,
  })
}

export default function Index() {
  const { resultCount, tags, theaters } = useLoaderData<typeof loader>()
  const submit = useSubmit()
  const [searchParams] = useSearchParams()
  const navigation = useNavigation()
  const location = useLocation()

  const optimisticSearchParams =
    navigation.state == 'loading' && navigation.location.pathname === location.pathname
      ? new URLSearchParams(navigation.location.search)
      : searchParams

  const searchParamTitle = optimisticSearchParams.get('title') ?? ''
  const searchParamDate = optimisticSearchParams.get('date') ?? ''
  const searchParamTags = optimisticSearchParams.getAll('tags') ?? ''
  const searchParamTheaters = optimisticSearchParams.getAll('theaters') ?? ''

  const [title, setTitle] = useState(searchParamTitle)

  useEffect(() => {
    setTitle(searchParamTitle ?? '')
  }, [searchParamTitle])

  return (
    <Form method="get" onChange={(event) => submit(event.currentTarget, { method: 'get' })}>
      <div className="p-6 space-y-4 pb-40">
        <input
          className="appearance-none text-white bg-transparent rounded-full border border-white w-full p-2 pl-4 pr-4"
          type="search"
          name="title"
          placeholder="Recherche par titre"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <p>Date</p>

        <div className="space-x-2">
          <label htmlFor={DATE_FILTER.DEFAULT}>Default</label>
          <input
            id={DATE_FILTER.DEFAULT}
            className=""
            type="radio"
            name="date"
            value={DATE_FILTER.DEFAULT}
            checked={searchParamDate === DATE_FILTER.DEFAULT}
            onChange={() => {}}
          />
        </div>

        <div className="space-x-2">
          <label htmlFor={DATE_FILTER.TODAY}>Aujourd'hui</label>
          <input
            id={DATE_FILTER.TODAY}
            className=""
            type="radio"
            name="date"
            value={DATE_FILTER.TODAY}
            checked={searchParamDate === DATE_FILTER.TODAY}
            onChange={() => {}}
          />
        </div>

        <div className="space-x-2">
          <label htmlFor={DATE_FILTER.THIS_WEEK}>Cette semaine</label>
          <input
            id={DATE_FILTER.THIS_WEEK}
            className=""
            type="radio"
            name="date"
            value={DATE_FILTER.THIS_WEEK}
            checked={searchParamDate === DATE_FILTER.THIS_WEEK}
            onChange={() => {}}
          />
        </div>

        <div className="space-x-2">
          <label htmlFor={DATE_FILTER.NEXT_WEEK}>Semaine prochaine</label>
          <input
            id={DATE_FILTER.NEXT_WEEK}
            className=""
            type="radio"
            name="date"
            value={DATE_FILTER.NEXT_WEEK}
            checked={searchParamDate === DATE_FILTER.NEXT_WEEK}
            onChange={() => {}}
          />
        </div>

        <p>Tags</p>

        <div className="flex gap-3 flex-row flex-wrap">
          {tags.length > 0 &&
            tags.map((tag) => (
              <div key={`tag-${tag.id.toString()}`} className="space-x-2 capitalize">
                <label htmlFor={`tag-${tag.id.toString()}`}>{tag.name}</label>
                <input
                  id={`tag-${tag.id.toString()}`}
                  className=""
                  type="checkbox"
                  name="tags"
                  value={tag.id}
                  checked={searchParamTags.includes(tag.id.toString())}
                  onChange={() => {}}
                />
              </div>
            ))}
        </div>

        <p>Cinémas</p>

        <div className="flex gap-3 flex-row flex-wrap">
          {theaters.length > 0 &&
            theaters.map((theater) => (
              <div key={`theater-${theater.id.toString()}`} className="space-x-2 capitalize">
                <label htmlFor={`theater-${theater.id.toString()}`}>{theater.name}</label>
                <input
                  id={`theater-${theater.id.toString()}`}
                  className=""
                  type="checkbox"
                  name="theaters"
                  value={theater.id}
                  checked={searchParamTheaters.includes(theater.id.toString())}
                  onChange={() => {}}
                />
              </div>
            ))}
        </div>
      </div>

      <div className="fixed bottom-0 z-5 p-8 w-full xl:w-4/6 space-y-4">
        <Link
          to={{ pathname: '../' }}
          type="submit"
          className="block rounded-full text-primary border-primary border p-2 pl-4 pr-4 w-full text-center bg-background"
        >
          Réinitialiser les filtres
        </Link>

        <Link
          to={{ pathname: '../', search: location.search }}
          className="block rounded-full bg-primary p-2 pl-4 pr-4 w-full text-center"
        >
          Montrer {resultCount} resultat{resultCount > 1 ? 's' : ''}
        </Link>
      </div>
    </Form>
  )
}
