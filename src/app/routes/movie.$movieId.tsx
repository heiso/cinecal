import { json, LoaderArgs, Response, V2_MetaFunction } from '@remix-run/node'
import { Outlet, useLoaderData, useNavigate } from '@remix-run/react'
import { blurhashToDataUri } from '@unpic/placeholder'
import { format } from 'date-fns'
import { useEffect } from 'react'
import { Context } from '../../core/context'
import { LOW_DEF_IMAGE_WIDTH, Poster, POSTER_RATIO } from '../poster'

const POSTER_WIDTH = 310

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
      posterUrlLowDef: movie.posterBlurHash
        ? blurhashToDataUri(
            movie.posterBlurHash,
            LOW_DEF_IMAGE_WIDTH,
            Math.round(LOW_DEF_IMAGE_WIDTH / POSTER_RATIO)
          )
        : null,
    },
  })
}

export const meta: V2_MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: `Cinecal - ${data.movie.title}` }]
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
      <div className="relative m-6 pb-6">
        <div
          className="absolute z-0 top-0 left-0 w-full h-full bg-no-repeat bg-cover bg-center overflow-hidden blur-3xl"
          style={{ backgroundImage: `url('${movie.posterUrlLowDef}')` }}
        ></div>
        <div
          className="w-1/2 m-auto"
          style={{
            aspectRatio: POSTER_RATIO,
          }}
        >
          {movie.posterUrl && (
            <Poster
              key={movie.id}
              movieId={movie.id}
              url={movie.posterUrl}
              srcLowDef={movie.posterUrlLowDef}
              alt={movie.title}
              width={POSTER_WIDTH}
            />
          )}
        </div>
      </div>
      <div className="relative z-1 m-6 space-y-4 -mt-6">
        <h1 className="text-white text-3xl inline-block">{movie.title}</h1>
        <div className="space-x-2">
          <span className="inline-block text-xs border-gray rounded-md border text-gray p-1">
            {movie.duration} min
          </span>
          <span className="text-gray text-sm">
            {movie.releaseYear}, {movie.director}
          </span>
        </div>

        <p className="text-white text-sm">{movie.synopsis}</p>
      </div>

      <div className="m-6 pb-48">
        <Outlet />
      </div>
    </>
  )
}
