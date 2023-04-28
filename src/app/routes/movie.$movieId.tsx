import { json, LoaderArgs, Response } from '@remix-run/node'
import { Outlet, useLoaderData, useNavigate } from '@remix-run/react'
import { format } from 'date-fns'
import { useEffect } from 'react'
import { Context } from '../../core/context'
import { Poster } from '../poster'

export const loader = async ({ context, params }: LoaderArgs) => {
  const ctx = context as unknown as Context
  const IMAGEKIT_URL = `https://ik.imagekit.io/cinecal/${
    process.env.ENV === 'development' ? 'posters-dev' : 'posters-prod'
  }`

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
      posterBlurHash: true,
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
      posterUrl: movie.posterUrl ? `${IMAGEKIT_URL}/${movie.posterUrl}` : null,
    },
  })
}

export default function Details() {
  const { movie } = useLoaderData<typeof loader>()

  const navigate = useNavigate()
  useEffect(() => {
    function handleKeyup(event: KeyboardEvent) {
      if (
        !event.defaultPrevented &&
        !['input', 'textarea'].includes(
          (event.target as HTMLElement).tagName.toLocaleLowerCase()
        ) &&
        event.key === 'Escape'
      ) {
        event.preventDefault()
        navigate('/')
      }
    }

    document.addEventListener('keyup', handleKeyup)

    return () => document.removeEventListener('keyup', handleKeyup)
  }, [navigate])

  return (
    <>
      <div className="relative w-full aspect-[62/85]">
        {movie.posterUrl && (
          <Poster
            className="absolute top-0 left-0 right-0 bottom-0"
            movieId={movie.id}
            url={movie.posterUrl}
            blurHash={movie.posterBlurHash}
            alt={movie.title}
            width={640}
          />
        )}
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
