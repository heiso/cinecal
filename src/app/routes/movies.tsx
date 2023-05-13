import { Prisma, Tag } from '@prisma/client'
import { LoaderArgs, json } from '@remix-run/node'
import { Link, Outlet, useLoaderData, useLocation } from '@remix-run/react'
import { blurhashToDataUri } from '@unpic/placeholder'
import { add, endOfDay, endOfWeek, isBefore, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Context } from '../../core/context'
import { ProgressiveImg } from '../progressiveImg'

const POSTER_WIDTH = 310
const LOW_DEF_IMAGE_WIDTH = 5
const POSTER_RATIO = 62 / 85

export enum DATE_FILTER {
  DEFAULT = 'DEFAULT',
  TODAY = 'TODAY',
  THIS_WEEK = 'THIS_WEEK',
  NEXT_WEEK = 'NEXT_WEEK',
}

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

  const imagekitUrl = `https://ik.imagekit.io/cinecal/${
    process.env.ENV === 'development' ? 'posters-dev' : 'posters-prod'
  }`

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

  const movies = await ctx.prisma.movie.findMany({
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
    select: {
      id: true,
      title: true,
      posterUrl: true,
      posterBlurHash: true,
      Tags: {
        select: {
          id: true,
          name: true,
        },
        where: {
          isFilterEnabled: true,
        },
      },
      Showtimes: {
        select: {
          id: true,
          Tags: {
            select: {
              id: true,
              name: true,
            },
            where: {
              isFilterEnabled: true,
            },
          },
          date: true,
          Theater: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        where: {
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
        orderBy: {
          date: 'asc',
        },
      },
    },
  })

  return json({
    tags: movies
      .flatMap((movie) => [...movie.Tags, ...movie.Showtimes.flatMap(({ Tags }) => Tags)])
      .reduce<Pick<Tag, 'id' | 'name'>[]>((acc, tag) => {
        if (!acc.find(({ id }) => id === tag.id)) {
          acc.push(tag)
        }
        return acc
      }, []),

    theaters: movies
      .flatMap(({ Showtimes }) => Showtimes.flatMap(({ Theater }) => Theater))
      .reduce<(typeof movies)[0]['Showtimes'][0]['Theater'][]>((acc, theater) => {
        if (!acc.find(({ id }) => id === theater.id)) {
          acc.push(theater)
        }
        return acc
      }, []),

    movies: movies
      .sort((movieA, movieB) =>
        isBefore(movieA.Showtimes[0].date, movieB.Showtimes[0].date) ? -1 : 1
      )
      .map((movie) => {
        // TODO: default src
        const src = movie.posterUrl
          ? `${imagekitUrl}/${movie.posterUrl}/tr:w-${POSTER_WIDTH},ar-62-85`
          : ''
        const srcLowDef = movie.posterBlurHash
          ? blurhashToDataUri(
              movie.posterBlurHash,
              LOW_DEF_IMAGE_WIDTH,
              Math.round(LOW_DEF_IMAGE_WIDTH / POSTER_RATIO)
            )
          : ''
        const srcBlur = srcLowDef

        return {
          id: movie.id,
          showtimeCount: movie.Showtimes.length,
          tags: [...movie.Tags, ...movie.Showtimes.flatMap((showtime) => showtime.Tags)].reduce<
            Pick<Tag, 'id' | 'name'>[]
          >((acc, tag) => {
            if (!acc.find(({ id }) => id === tag.id)) {
              acc.push(tag)
            }
            return acc
          }, []),
          title: movie.title,
          url: `${movie.id}`,
          src,
          srcLowDef,
          srcBlur,
        }
      }),
    // .filter(
    //   (movie) =>
    //     filters.tags.length === 0 ||
    //     movie.tags.find((tag) => filters.tags.includes(tag.toLowerCase()))
    // ),
  })
}

export default function Index() {
  const { movies } = useLoaderData<typeof loader>()
  const location = useLocation()

  return (
    <>
      <div className="grow shrink-0 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 p-6 ">
          {movies.map((movie) => (
            <Link
              key={movie.id}
              to={{ pathname: movie.url, search: location.search }}
              className="relative block aspect-poster"
            >
              <div
                className="absolute z-0 top-0 left-0 w-full h-full bg-no-repeat bg-cover bg-center overflow-hidden blur-3xl opacity-50 rounded-xl"
                style={{ backgroundImage: `url('${movie.srcBlur}')` }}
              ></div>
              <ProgressiveImg
                className="w-full overflow-hidden aspect-poster rounded-xl"
                key={movie.id}
                src={movie.src}
                srcLowDef={movie.srcLowDef}
                alt={movie.title}
                loading="lazy"
              />
              <div className="absolute top-2 left-2">
                <div
                  style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
                  className="text-white pt-1 pb-1 pl-3 pr-3 text-xs font-bold backdrop-blur-xl rounded-full bg-opacity-50 bg-black"
                >
                  <span>{movie.showtimeCount}</span>
                  <span className="text-xs font-light">
                    {' '}
                    Séance{movie.showtimeCount > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {movie.tags.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0">
                  <div className="backdrop-blur-xl bg-opacity-50 bg-black p-1 rounded-xl w-fit m-auto mb-2">
                    {movie.tags.map((tag) => (
                      <div key={tag.id} className="text-white pl-2 pr-2 w-full text-center text-xs">
                        <span>{tag.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 z-5 p-8 w-full">
        <Link
          className="block rounded-full bg-primary p-2 pl-4 pr-4 w-full text-center"
          to={{ pathname: 'filters', search: location.search }}
        >
          Filtres
        </Link>
      </div>

      <Outlet />
    </>
  )
}
