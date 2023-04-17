import { json, LoaderArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { isBefore } from 'date-fns'
import { Context } from '../../core/context'
import { IMAGEKIT_URL, Poster, POSTER_RATIO } from '../poster'

const SHOWTIMES_COUNT_TO_BE_FEATURED = 2
const POSTER_WIDTH = 310

export const loader = async ({ context }: LoaderArgs) => {
  const ctx = context as unknown as Context

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
        posterUrl: `${IMAGEKIT_URL}/${movie.id}`,
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
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
      {movies.map((movie) => (
        <div
          key={movie.id}
          className="shadow-white"
          style={{
            aspectRatio: POSTER_RATIO,
            ...(movie.isFeatured && { boxShadow: '4px 4px' }),
          }}
        >
          <Link to={`/details/${movie.id}/showtimes`} className="relative block w-full h-full">
            <Poster
              className="w-full h-full"
              key={movie.id}
              movieId={movie.id}
              url={movie.posterUrl}
              blurHash={movie.posterBlurHash}
              alt={movie.title}
              width={POSTER_WIDTH}
            />
            <div className="absolute bottom-0 left-0">
              <div className="bg-white text-black pl-2 pr-2 text-sm font-bold w-fit">
                {movie.count}
              </div>
              {movie.tags.map((tag) => (
                <div key={tag} className="bg-white text-black pl-2 pr-2 text-sm font-bold w-fit">
                  {tag}
                </div>
              ))}
            </div>
          </Link>
        </div>
      ))}
    </div>
  )
}
