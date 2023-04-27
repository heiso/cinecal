import { json, LoaderArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { isBefore } from 'date-fns'
import { Context } from '../../core/context'
import { Poster, POSTER_RATIO } from '../poster'

const SHOWTIMES_COUNT_TO_BE_FEATURED = 2
const POSTER_WIDTH = 310

export const loader = async ({ context }: LoaderArgs) => {
  const ctx = context as unknown as Context
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
          tags.push('AvP')
        }
      })

      return {
        ...movie,
        isFeatured:
          movie.Showtimes.find(({ isPreview }) => isPreview) ||
          movie.Showtimes.length <= SHOWTIMES_COUNT_TO_BE_FEATURED,
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

  return json({
    movies: [
      ...sorted.filter((movie) => movie.isFeatured),
      ...sorted.filter((movie) => !movie.isFeatured),
    ],
  })
}

export default function Index() {
  const { movies } = useLoaderData<typeof loader>()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 p-6">
      {movies.map((movie) => (
        <div
          key={movie.id}
          className="rounded-xl overflow-hidden"
          style={{
            aspectRatio: POSTER_RATIO,
          }}
        >
          <Link to={`/details/${movie.id}/showtimes`} className="relative block w-full h-full">
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
            {movie.tags.length && (
              <div className="absolute bottom-0 left-0 right-0">
                <div className="backdrop-blur-xl bg-opacity-40 bg-black p-1 rounded-xl w-fit m-auto mb-2">
                  {movie.tags.map((tag) => (
                    <div
                      key={tag}
                      className="text-white pl-2 pr-2 w-full text-center text-xs font-light"
                    >
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Link>
        </div>
      ))}
    </div>
  )
}
