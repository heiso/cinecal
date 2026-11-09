import { and } from '@prisma/orm-postgres/orm-client'
import { add, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect } from 'react'
import { data, href, Link, useLocation, useNavigate } from 'react-router'
import { ProgressiveImg } from '../components/progressive-img'
import { db } from '../db.server'
import { env } from '../env.server'
import { getFilters, getWhereInputs } from '../filters.server'
import { getPosterSrc } from '../poster.server'
import { Icon } from '../ui/icon'
import type { Route } from './+types/movie'

const GOOGLE_CALENDAR_DATE_FORMAT = "yyyyMMdd'T'HHmmss"

export async function loader({ params, request }: Route.LoaderArgs) {
  const movieId = Number(params.movieId)
  if (!Number.isSafeInteger(movieId)) {
    throw data('Not Found', { status: 404, statusText: 'Not Found' })
  }

  const filters = getFilters(request)
  const where = getWhereInputs(filters)

  const movie = await db.orm.public.Movie.where({ id: movieId })
    .select(
      'id',
      'title',
      'releaseDate',
      'posterUrl',
      'posterBlurHash',
      'posterAllocineUrl',
      'synopsis',
      'director',
      'duration',
    )
    .include('Tags', (tags) =>
      tags
        .where((tag) => tag.category.eq('GENRE'))
        .select('id', 'name')
        .orderBy((tag) => tag.id.asc()),
    )
    .first()

  if (movie == null) {
    throw data('Not Found', { status: 404, statusText: 'Not Found' })
  }

  const theaters = await db.orm.public.Theater.where((theater) =>
    theater.Showtimes.some((showtime) =>
      and(showtime.movieId.eq(movieId), where.showtime(showtime)),
    ),
  )
    .select('id', 'name', 'website', 'address')
    .include('Showtimes', (showtimes) =>
      showtimes
        .where((showtime) =>
          and(
            showtime.movieId.eq(movieId),
            showtime.date.gte(new Date()),
            where.showtime(showtime),
          ),
        )
        .select('id', 'date', 'language', 'ticketingUrl', 'isPreview')
        .include('Tags', (tags) => tags.select('id', 'name').orderBy((tag) => tag.id.asc()))
        .orderBy((showtime) => showtime.date.asc()),
    )
    .orderBy((theater) => theater.name.asc())
    .all()

  const url = new URL(href('/:movieId', { movieId: String(movie.id) }), env.PUBLIC_URL).toString()

  const { src, srcLowDef } = getPosterSrc(
    movie.posterUrl,
    movie.posterBlurHash,
    movie.posterAllocineUrl,
  )

  const mapShowtime = (
    showtime: (typeof theaters)[0]['Showtimes'][0],
    theater: (typeof theaters)[0],
  ) => {
    const calendarUrl = new URL('https://calendar.google.com/calendar/event')
    calendarUrl.searchParams.append('action', 'TEMPLATE')
    calendarUrl.searchParams.append(
      'dates',
      `${format(showtime.date, GOOGLE_CALENDAR_DATE_FORMAT)}/${format(
        add(showtime.date, { minutes: movie.duration }),
        GOOGLE_CALENDAR_DATE_FORMAT,
      )}`,
    )
    // The dates above are Paris wall clock times
    calendarUrl.searchParams.append('ctz', 'Europe/Paris')
    calendarUrl.searchParams.append('text', `${theater.name} - ${movie.title}`)
    calendarUrl.searchParams.append('location', `${theater.name} ${theater.address}`)
    if (showtime.Tags.length) {
      calendarUrl.searchParams.append(
        'details',
        `Page du film <a href=${url} target="_blank">${url}</a>\nRéserver une place <a href="${showtime.ticketingUrl}" target="_blank">${
          showtime.ticketingUrl
        }</a>`,
      )
    }

    const addToCalendarUrl = calendarUrl.toString()

    return {
      id: showtime.id,
      date: format(showtime.date, `HH'h'mm`, { locale: fr }),
      language: showtime.language,
      tags: [{ id: showtime.language, name: showtime.language }, ...showtime.Tags],
      ticketingUrl: showtime.ticketingUrl,
      addToCalendarUrl,
    }
  }

  return {
    filterCount: filters.count,

    movie: {
      id: movie.id,
      url,
      tags: movie.Tags,
      title: movie.title,
      src,
      srcLowDef,
      duration: movie.duration,
      // A calendar date, "yyyy-MM-dd"
      releaseDate: movie.releaseDate?.slice(0, 4) ?? null,
      director: movie.director,
      synopsis: movie.synopsis,
    },

    theaters: theaters.map((theater) => {
      return {
        id: theater.id,
        name: theater.name,
        website: theater.website,
        address: theater.address,
        days: theater.Showtimes.reduce<
          { day: string; showtimes: ReturnType<typeof mapShowtime>[] }[]
        >((acc, showtime) => {
          const day = format(showtime.date, `E dd LLL`, { locale: fr })
          const showtimesByDay = acc.find((item) => item.day === day)
          const extendedShowtime = mapShowtime(showtime, theater)
          if (showtimesByDay) {
            showtimesByDay.showtimes.push(extendedShowtime)
          } else {
            acc.push({ day, showtimes: [extendedShowtime] })
          }
          return acc
        }, []),
        daysByTags: theater.Showtimes.reduce<
          {
            key: string
            tags: ReturnType<typeof mapShowtime>['tags']
            days: { day: string; showtimes: ReturnType<typeof mapShowtime>[] }[]
          }[]
        >((acc, showtime) => {
          const extendedShowtime = mapShowtime(showtime, theater)
          const key = extendedShowtime.tags.map(({ id }) => id).join('-')
          const showtimesByTags = acc.find((showtimeByTags) => showtimeByTags.key === key)
          const day = format(showtime.date, `EEEE dd LLLL`, { locale: fr })

          if (showtimesByTags) {
            const showtimesByDay = showtimesByTags.days.find(
              (showtimeByTags) => showtimeByTags.day === day,
            )

            if (showtimesByDay) {
              showtimesByDay.showtimes.push(extendedShowtime)
            } else {
              showtimesByTags.days.push({ day, showtimes: [extendedShowtime] })
            }
          } else {
            acc.push({
              key,
              tags: extendedShowtime.tags,
              days: [{ day, showtimes: [extendedShowtime] }],
            })
          }

          return acc
        }, []).sort((a, b) => (a.tags.length > b.tags.length ? -1 : 1)),
      }
    }),
  }
}

export default function Movie({ loaderData }: Route.ComponentProps) {
  const { movie, theaters, filterCount } = loaderData
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyup(event: KeyboardEvent) {
      if (
        !event.defaultPrevented &&
        !['input', 'textarea'].includes(
          (event.target as HTMLElement).tagName.toLocaleLowerCase(),
        ) &&
        event.key === 'Escape'
      ) {
        event.preventDefault()
        navigate(-1)
      }
    }

    document.addEventListener('keyup', handleKeyup)

    return () => document.removeEventListener('keyup', handleKeyup)
  }, [navigate])

  return (
    <>
      <title>{`Cinecal - ${movie.title}`}</title>
      <meta property="og:type" content="website" />
      <meta property="og:url" content={movie.url} />
      <meta property="og:title" content={movie.title} />
      {movie.synopsis && <meta property="og:description" content={movie.synopsis} />}
      {movie.src && <meta property="og:image" content={movie.src} />}
      <div className="p-6 pb-28">
        <Link
          to={{ pathname: '/', hash: movie.id.toString() }}
          className="absolute z-10 w-fit fill-white"
        >
          <Icon id="cross-2" width="32px" height="32px" />
        </Link>

        <div className="relative mb-6">
          <div
            className="absolute top-0 left-0 z-0 h-full w-full bg-cover bg-center bg-no-repeat blur-3xl"
            style={{ backgroundImage: `url('${movie.srcLowDef}')` }}
          ></div>
          {movie.src ? (
            <ProgressiveImg
              className="m-auto block aspect-poster w-1/2 rounded-xl object-cover"
              src={movie.src}
              srcLowDef={movie.srcLowDef}
              alt={movie.title}
            />
          ) : (
            <div className="w-full pt-8"></div>
          )}
        </div>

        <div className="relative z-1 space-y-4 pb-4">
          <h1 className="inline-block text-3xl text-white">{movie.title}</h1>

          <div className="space-x-2">
            <span className="inline-block rounded-md border border-gray p-1 text-xs text-gray">
              {movie.duration} min
            </span>
            <span className="text-sm text-gray">
              {[movie.releaseDate, movie.director].filter(Boolean).join(', ')}
            </span>
          </div>

          <div className="flex flex-wrap">
            {movie.tags.length > 0 &&
              movie.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="mr-2 mb-2 inline-block rounded-md border border-gray p-1 text-xs text-gray"
                >
                  {tag.name}
                </span>
              ))}
          </div>

          <p className="text-white">{movie.synopsis}</p>
        </div>

        {theaters?.map((theater) => (
          <div className="flex flex-col gap-8 py-4" key={theater.id}>
            {theater.daysByTags.map(({ tags, days }, index) => (
              <div key={index} className="flex flex-col">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="mr-2 text-lg font-medium">
                    <Link to={theater.website} target="_blank">
                      {theater.name}
                    </Link>
                  </h2>

                  {tags.map(({ name }) => (
                    <div
                      className="inline-block rounded-md border bg-gray px-2 py-1 text-xs font-bold text-black"
                      key={name}
                    >
                      {name}
                    </div>
                  ))}
                </div>

                {days.map(({ day, showtimes }) => (
                  <div key={day}>
                    {day.startsWith('lundi') && <div className="p-2"></div>}
                    <div className="flex flex-col gap-4 border-l-8 border-gray/20 pb-6 pl-4">
                      <div className="flex flex-wrap capitalize">{day}</div>
                      <div className="flex flex-wrap gap-4">
                        {showtimes.map((showtime) => (
                          <Link
                            key={showtime.id}
                            target="_blank"
                            to={showtime.addToCalendarUrl}
                            style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
                            className="inline-block rounded-md bg-primary px-4 py-2 text-center"
                          >
                            {showtime.date}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {filterCount > 0 && (
        <div className="fixed bottom-0 z-5 m-auto w-full max-w-(--breakpoint-sm) p-6">
          <Link
            style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
            className="block items-center rounded-md bg-primary p-4 text-center"
            to={{ pathname: location.pathname }}
          >
            <>
              Enlever
              <span className="mr-2 ml-2 inline-block rounded-full bg-black/20 p-1 pr-2 pl-2 text-xs font-bold">
                {filterCount}
              </span>
              filtre{filterCount > 0 ? 's' : ''}
            </>
          </Link>
        </div>
      )}
    </>
  )
}
