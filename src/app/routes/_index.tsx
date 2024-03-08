import { MovieTag, ShowtimeTag } from '@prisma/client'
import { LoaderArgs, json } from '@remix-run/node'
import { Link, useLoaderData, useLocation } from '@remix-run/react'
import { isBefore } from 'date-fns'
import { Context } from '../../core/context'
import { getFilters, getWhereInputs } from '../filters.server'
import { getPosterSrc } from '../poster.server'
import { ProgressiveImg } from '../progressiveImg'

export const loader = async ({ context, params, request }: LoaderArgs) => {
  const ctx = context as unknown as Context

  const filters = getFilters(request)
  const where = getWhereInputs(filters)

  const movies = await ctx.prisma.movie.findMany({
    where: {
      ...where.movieWhereInput,
      Showtimes: {
        some: {
          ...where.showtimeWhereInput,
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
          featured: true,
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
              featured: true,
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
          ...where.showtimeWhereInput,
        },
        orderBy: {
          date: 'asc',
        },
      },
    },
  })

  return json(
    {
      filterCount: filters.count,

      movies: movies
        .sort((movieA, movieB) =>
          isBefore(movieA.Showtimes[0].date, movieB.Showtimes[0].date) ? -1 : 1
        )
        .map((movie) => {
          const { src, srcLowDef } = getPosterSrc(movie.posterUrl, movie.posterBlurHash)

          return {
            id: movie.id,
            showtimeCount: movie.Showtimes.length,
            tags: [...movie.Tags, ...movie.Showtimes.flatMap((showtime) => showtime.Tags)].reduce<
              Pick<MovieTag | ShowtimeTag, 'id' | 'name'>[]
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
            srcBlur: srcLowDef,
          }
        }),
    },
    {
      headers: {
        'Cache-Control': 'max-age=3600, public',
      },
    }
  )
}

export default function Index() {
  const { movies, filterCount } = useLoaderData<typeof loader>()
  const location = useLocation()

  return (
    <>
      <h1 className="text-4xl p-6 pb-0">Séances</h1>
      <p className="p-6 pt-0 pb-0 text-gray">Explorez le cinéma à votre rythme</p>
      {movies.length === 0 && (
        <div className="flex w-full h-1/3">
          <div className="self-end grow text-center text-lg">
            Aucune séance <br />
            😕
          </div>
        </div>
      )}
      {movies.length > 0 && (
        <div className="grid grid-cols-2 gap-6 p-6 pb-28">
          {movies.map((movie) => (
            <Link
              prefetch="viewport"
              key={movie.id}
              to={{ pathname: movie.url, search: location.search }}
              className="relative block aspect-poster"
            >
              {/* <div
                className="absolute z-0 top-0 left-0 w-full h-full bg-no-repeat bg-cover bg-center overflow-hidden blur-3xl opacity-50 rounded-xl"
                style={{ backgroundImage: `url('${movie.srcBlur}')` }}
              ></div> */}
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
      )}

      <div className="fixed bottom-0 z-5 p-6 w-full max-w-screen-sm m-auto">
        <Link
          style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
          className="block items-center rounded-md bg-primary p-4 text-center"
          to={{ pathname: 'filters', search: location.search }}
        >
          {filterCount > 0 ? (
            <>
              Filtres
              <span className="ml-2 p-1 pl-2 pr-2 text-xs font-bold bg-black bg-opacity-20 rounded-full inline-block">
                {filterCount}
              </span>
            </>
          ) : (
            <>Filtrer</>
          )}
        </Link>
      </div>
    </>
  )
}
