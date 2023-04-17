import { json, LoaderArgs, Response } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { format } from 'date-fns'
import { Context } from '../../core/context'
import { Poster } from '../poster'

const IMAGEKIT_URL = `https://ik.imagekit.io/cinecal/posters-${
  process.env.ENV === 'development' ? 'dev' : 'prod'
}/`

export const loader = async ({ context, params }: LoaderArgs) => {
  const ctx = context as unknown as Context

  if (!params.movieId || isNaN(Number(params.movieId))) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
  }

  const movie = await ctx.prisma.movie.findFirst({
    where: {
      id: Number(params.movieId),
    },
    select: {
      id: true,
      title: true,
      releaseDate: true,
      posterUrl: true,
      tags: true,
      synopsis: true,
      director: true,
      duration: true,
    },
  })

  if (!movie) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
  }

  return json({
    movie: {
      ...movie,
      ...(movie.releaseDate && { releaseYear: format(movie.releaseDate, 'yyyy') }),
      posterUrl: `${IMAGEKIT_URL}/${movie.id}`,
    },
  })
}

export default function Details() {
  const { movie } = useLoaderData<typeof loader>()

  return (
    <>
      <div className="relative w-full aspect-[62/85]">
        <Poster
          className="absolute top-0 left-0 right-0 bottom-0"
          url={movie.posterUrl}
          alt={movie.title}
          width={640}
        />
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-t from-background to-transparent bg-no-repeat"></div>
      </div>
      <div className="m-4 space-y-2">
        <h1 className="text-white text-3xl inline-block">{movie.title}</h1>
        <div>
          <span className="inline-block text-xs border-gray rounded-md border text-gray p-1">
            {movie.duration} min
          </span>
        </div>
        <p className="text-gray text-sm">
          {movie.releaseYear}, {movie.director}
        </p>
        <p className="text-white text-sm">{movie.synopsis}</p>
      </div>

      <div className="m-4 pb-48">
        <Outlet />
      </div>
    </>
  )
}
