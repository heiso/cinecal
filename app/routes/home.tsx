import { isBefore } from 'date-fns'
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
      .sort((movieA, movieB) =>
        isBefore(movieA.Showtimes[0].date, movieB.Showtimes[0].date) ? -1 : 1,
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
              id={movie.id.toString()}
              prefetch="viewport"
              key={movie.id}
              to={{ pathname: movie.url, search: location.search }}
              className="relative block aspect-poster"
            >
              {movie.src ? (
                <ProgressiveImg
                  className="w-full overflow-hidden aspect-poster rounded-xl"
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
                  className="text-white pt-1 pb-1 pl-3 pr-3 text-xs font-bold backdrop-blur-xl rounded-full bg-black/50"
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
                  <div className="backdrop-blur-xl bg-black/50 p-1 rounded-xl w-fit m-auto mb-2">
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

      <div className="fixed bottom-0 z-5 p-6 w-full max-w-(--breakpoint-sm) m-auto">
        <Link
          style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
          className="block items-center rounded-md bg-primary p-4 text-center"
          to={{ pathname: 'filters', search: location.search }}
        >
          {filterCount > 0 ? (
            <>
              Filtres
              <span className="ml-2 p-1 pl-2 pr-2 text-xs font-bold bg-black/20 rounded-full inline-block">
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
