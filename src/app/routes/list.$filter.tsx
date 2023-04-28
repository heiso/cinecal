import { json, LoaderArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { isBefore } from 'date-fns'
import { Context } from '../../core/context'
import { Poster, POSTER_RATIO } from '../poster'

const SHOWTIMES_COUNT_TO_BE_FEATURED = 2
const POSTER_WIDTH = 310
const TAGS = ['featured', 'avant première', 'grand large', 'marathon']

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.substring(1)
}

export const loader = async ({ context, params }: LoaderArgs) => {
  const ctx = context as unknown as Context

  const filter =
    params.filter && (TAGS.includes(params.filter) || params.filter === 'all')
      ? params.filter
      : 'featured'

  const IMAGEKIT_URL = `https://ik.imagekit.io/cinecal/${
    process.env.ENV === 'development' ? 'posters-dev' : 'posters-prod'
  }`
  const movies = await ctx.prisma.movie.findMany({
    where: {
      Showtimes: {
        some: {
          date: { gte: new Date() },
        },
      },
    },
    select: {
      id: true,
      title: true,
      releaseDate: true,
      posterUrl: true,
      posterBlurHash: true,
      tags: true,
      Showtimes: {
        select: {
          id: true,
          date: true,
          tags: true,
          isPreview: true,
        },
      },
    },
    orderBy: { title: 'asc' },
  })

  const sorted = movies
    .map((movie) => {
      const tags = [...movie.tags, ...movie.Showtimes.flatMap(({ tags }) => tags)]

      movie.Showtimes.forEach((showtime) => {
        if (showtime.isPreview) {
          tags.push('avant première')
        }
      })

      if (
        movie.Showtimes.find(({ isPreview }) => isPreview) ||
        movie.Showtimes.length <= SHOWTIMES_COUNT_TO_BE_FEATURED
      ) {
        tags.push('featured')
      }

      return {
        ...movie,
        tags: [...new Set(tags)],
        count: movie.Showtimes.length,
        posterUrl: movie.posterUrl ? `${IMAGEKIT_URL}/${movie.posterUrl}` : null,
      }
    })
    .sort((movieA, movieB) =>
      isBefore(
        movieA.Showtimes[movieA.Showtimes.length - 1].date,
        movieB.Showtimes[movieB.Showtimes.length - 1].date
      )
        ? -1
        : 1
    )

  if (filter === 'all') {
    return json({
      movies: sorted,
      filter,
    })
  }

  return json({
    movies: sorted.filter((movie) => movie.tags.find((tag) => tag.toLowerCase() === filter)),
    filter,
  })
}

export default function Index() {
  const { movies, filter } = useLoaderData<typeof loader>()

  return (
    <>
      <div className="p-6 pb-0 flex gap-3 flex-row flex-wrap">
        <Link
          className={`border rounded-full p-1 pl-4 pr-4 inline-block text-center flex-grow ${
            filter === 'all' ? 'text-primary' : ''
          }`}
          to={`/list/all`}
        >
          All
        </Link>
        {TAGS.map((tag) => (
          <Link
            className={`border rounded-full p-1 pl-4 pr-4 inline-block text-center flex-grow ${
              filter === tag ? 'text-primary' : ''
            }`}
            to={`/list/${tag}`}
            key={tag}
          >
            {capitalize(tag)}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 p-6">
        {movies.map((movie) => (
          <Link
            key={movie.id}
            to={`/movie/${movie.id}`}
            className="rounded-xl overflow-hidden relative block w-full h-full"
            style={{
              aspectRatio: POSTER_RATIO,
            }}
          >
            {movie.posterUrl && (
              <Poster
                className="w-full h-full"
                key={movie.id}
                movieId={movie.id}
                url={movie.posterUrl}
                blurHash={movie.posterBlurHash}
                alt={movie.title}
                width={POSTER_WIDTH}
              />
            )}
            <div className="absolute top-2 left-2">
              <div
                style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
                className="text-white pt-1 pb-1 pl-3 pr-3 text-xs font-bold backdrop-blur-xl rounded-full bg-opacity-40 bg-black"
              >
                <span>{movie.count}</span>
                <span className="text-xs font-light"> Séance{movie.count > 1 ? 's' : ''}</span>
              </div>
            </div>
            {movie.tags.filter((tag) => tag !== 'featured').length && (
              <div className="absolute bottom-0 left-0 right-0">
                <div className="backdrop-blur-xl bg-opacity-40 bg-black p-1 rounded-xl w-fit m-auto mb-2">
                  {movie.tags
                    .filter((tag) => tag !== 'featured')
                    .map((tag) => (
                      <div
                        key={tag}
                        className="text-white pl-2 pr-2 w-full text-center text-xs font-light"
                      >
                        <span>{capitalize(tag)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </>
  )
}
