import { Link, useLocation } from 'react-router'
import { PosterFalback } from '../components/poster-fallback'
import { ProgressiveImg } from '../components/progressive-img'
import { db } from '../db.server'
import { getFilters, getWhereInputs } from '../filters.server'
import { getPosterSrc } from '../poster.server'
import type { Route } from './+types/home'

export async function loader({ request }: Route.LoaderArgs) {
  const filters = getFilters(request)
  const where = getWhereInputs(filters)

  const movies = await db.orm.public.Movie.where(where.movie)
    .select('id', 'title', 'posterUrl', 'posterBlurHash', 'posterAllocineUrl')
    .include('Tags', (tags) =>
      tags
        .select('id', 'name')
        .where((tag) => tag.featured.eq(true))
        .orderBy((tag) => tag.id.asc()),
    )
    .include('Showtimes', (showtimes) =>
      showtimes
        .select('id', 'date')
        .where(where.showtime)
        .orderBy((showtime) => showtime.date.asc())
        .include('Tags', (tags) =>
          tags
            .select('id', 'name')
            .where((tag) => tag.featured.eq(true))
            .orderBy((tag) => tag.id.asc()),
        )
        .include('Theater', (theater) => theater.select('id', 'name')),
    )
    .orderBy((movie) => movie.id.asc())
    .all()

  return {
    filterCount: filters.count,

    movies: movies
      // Every listed movie has a showtime (see getWhereInputs); the sort is stable, so ties keep the id order
      .sort(
        (movieA, movieB) =>
          (movieA.Showtimes[0]?.date.getTime() ?? Infinity) -
          (movieB.Showtimes[0]?.date.getTime() ?? Infinity),
      )
      .map((movie) => {
        const { src, srcLowDef } = getPosterSrc(
          movie.posterUrl,
          movie.posterBlurHash,
          movie.posterAllocineUrl,
        )

        const tags: { id: number; name: string }[] = []
        for (const tag of [...movie.Tags, ...movie.Showtimes.flatMap(({ Tags }) => Tags)]) {
          if (!tags.some(({ id }) => id === tag.id)) {
            tags.push(tag)
          }
        }

        return {
          id: movie.id,
          showtimeCount: movie.Showtimes.length,
          tags,
          title: movie.title,
          url: `${movie.id}`,
          src,
          srcLowDef,
        }
      }),
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { movies, filterCount } = loaderData
  const location = useLocation()

  return (
    <>
      <title>Cinecal</title>
      <h1 className="p-6 pb-0 text-4xl">Séances</h1>
      <p className="p-6 pt-0 pb-0 text-gray">Explorez le cinéma à votre rythme</p>
      {movies.length === 0 && (
        <div className="flex h-1/3 w-full">
          <div className="grow self-end text-center text-lg">
            Aucune séance <br />😕
          </div>
        </div>
      )}
      {movies.length > 0 && (
        <div className="grid grid-cols-2 gap-6 p-6 pb-28">
          {movies.map((movie) => (
            <Link
              id={movie.id.toString()}
              prefetch="viewport"
              key={movie.id}
              to={{ pathname: movie.url, search: location.search }}
              className="relative block aspect-poster"
            >
              {movie.src ? (
                <ProgressiveImg
                  className="aspect-poster w-full rounded-xl"
                  key={movie.id}
                  src={movie.src}
                  srcLowDef={movie.srcLowDef}
                  alt={movie.title}
                  loading="lazy"
                />
              ) : (
                <PosterFalback title={movie.title} />
              )}
              <div className="absolute top-2 left-2">
                <div
                  style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
                  className="rounded-full bg-black/50 pt-1 pr-3 pb-1 pl-3 text-xs font-bold text-white backdrop-blur-xl"
                >
                  <span>{movie.showtimeCount}</span>
                  <span className="text-xs font-light">
                    {' '}
                    Séance{movie.showtimeCount > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {movie.tags.length > 0 && (
                <div className="absolute right-0 bottom-0 left-0">
                  <div className="m-auto mb-2 w-fit rounded-xl bg-black/50 p-1 backdrop-blur-xl">
                    {movie.tags.map((tag) => (
                      <div key={tag.id} className="w-full pr-2 pl-2 text-center text-xs text-white">
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

      <div className="fixed bottom-0 z-5 m-auto w-full max-w-(--breakpoint-sm) p-6">
        <Link
          style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
          className="block items-center rounded-md bg-primary p-4 text-center"
          to={{ pathname: 'filters', search: location.search }}
        >
          {filterCount > 0 ? (
            <>
              Filtres
              <span className="ml-2 inline-block rounded-full bg-black/20 p-1 pr-2 pl-2 text-xs font-bold">
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
