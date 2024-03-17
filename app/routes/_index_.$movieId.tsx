import { TagCategory } from '@prisma/client'
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData, useLocation, useNavigate } from '@remix-run/react'
import { add, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect } from 'react'
import { getFilters, getWhereInputs } from '../filters.server'
import { getPosterSrc } from '../poster.server'
import { prisma } from '../prisma.server'
import { ProgressiveImg } from '../progressiveImg'
import { Icon } from '../ui/icon'

const GOOGLE_CALENDAR_DATE_FORMAT = "yyyyMMdd'T'HHmmss"

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  if (!data) return []
  return [
    { title: `Cinecal - ${data.movie.title}` },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: location.pathname },
    { property: 'og:title', content: data.movie.title },
    { property: 'og:description', content: data.movie.synopsis },
    { property: 'og:image', content: data.movie.src },
  ]
}

export const loader = async ({ context, params, request }: LoaderFunctionArgs) => {
  if (!params.movieId || isNaN(Number(params.movieId))) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
  }

  const filters = getFilters(request)
  const where = getWhereInputs(filters)

  const movieId = Number(params.movieId)

  const movie = await prisma.movie.findFirst({
    where: {
      id: movieId,
    },
    select: {
      id: true,
      title: true,
      releaseDate: true,
      posterUrl: true,
      posterBlurHash: true,
      Tags: {
        where: {
          category: TagCategory.GENRE,
        },
        select: {
          id: true,
          name: true,
        },
      },
      synopsis: true,
      director: true,
      duration: true,
    },
  })

  if (movie == null) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
  }

  const theaters = await prisma.theater.findMany({
    where: {
      Showtimes: {
        some: {
          Movie: {
            id: movieId,
          },
          ...where.showtimeWhereInput,
        },
      },
    },
    select: {
      id: true,
      name: true,
      website: true,
      address: true,
      Showtimes: {
        where: {
          movieId,
          date: { gte: new Date() },
          ...where.showtimeWhereInput,
        },
        select: {
          id: true,
          date: true,
          language: true,
          Tags: {
            select: {
              id: true,
              name: true,
            },
          },
          ticketingUrl: true,
          isPreview: true,
        },
        orderBy: {
          date: 'asc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  const { src, srcLowDef } = getPosterSrc(movie.posterUrl, movie.posterBlurHash)

  const mapShowtime = (
    showtime: (typeof theaters)[0]['Showtimes'][0],
    theater: (typeof theaters)[0],
  ) => {
    const url = new URL('https://calendar.google.com/calendar/event')
    url.searchParams.append('action', 'TEMPLATE')
    url.searchParams.append(
      'dates',
      `${format(showtime.date, GOOGLE_CALENDAR_DATE_FORMAT)}/${format(
        add(showtime.date, { minutes: movie.duration }),
        GOOGLE_CALENDAR_DATE_FORMAT,
      )}`,
    )
    url.searchParams.append('text', `${theater.name} - ${movie.title}`)
    url.searchParams.append('location', theater.address)
    if (showtime.Tags.length) {
      url.searchParams.append(
        'details',
        `Ticket: <a href="${showtime.ticketingUrl}">${
          showtime.ticketingUrl
        }</a>\nTags: ${showtime.Tags.map(({ name }) => name).join(', ')}`,
      )
    }

    const addToCalendarUrl = url.toString()

    return {
      id: showtime.id,
      date: format(showtime.date, `HH'h'mm`, { locale: fr }),
      language: showtime.language,
      tags: [{ id: showtime.language, name: showtime.language }, ...showtime.Tags],
      ticketingUrl: showtime.ticketingUrl,
      addToCalendarUrl,
    }
  }

  return json({
    filterCount: filters.count,

    movie: {
      tags: movie.Tags,
      title: movie.title,
      src,
      srcLowDef,
      duration: movie.duration,
      releaseDate: movie.releaseDate ? format(movie.releaseDate, 'yyyy') : null,
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
  })
}

export default function Index() {
  const { movie, theaters, filterCount } = useLoaderData<typeof loader>()
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
      <div className="p-6 pb-28">
        <Link to={{ pathname: '/' }} className="fill-white w-fit absolute z-10">
          <Icon id="cross-2" width="32px" height="32px" />
        </Link>

        <div className="relative mb-6">
          <div
            className="absolute z-0 top-0 left-0 w-full h-full bg-no-repeat bg-cover bg-center blur-3xl"
            style={{ backgroundImage: `url('${movie.srcLowDef}')` }}
          ></div>
          <ProgressiveImg
            className="w-1/2 m-auto aspect-poster overflow-hidden rounded-xl"
            src={movie.src}
            srcLowDef={movie.srcLowDef}
            alt={movie.title}
          />
        </div>

        <div className="relative z-1 space-y-4 pb-4">
          <h1 className="text-white text-3xl inline-block">{movie.title}</h1>

          <div className="space-x-2">
            <span className="inline-block text-xs border-gray rounded-md border text-gray p-1">
              {movie.duration} min
            </span>
            <span className="text-gray text-sm">
              {movie.releaseDate}, {movie.director}
            </span>
          </div>

          <div className="flex flex-wrap">
            {movie.tags.length &&
              movie.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="mr-2 mb-2 inline-block text-xs border-gray rounded-md border text-gray p-1"
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
                <div className="flex gap-2 items-center mb-4">
                  <h2 className="font-medium text-lg mr-2">
                    <Link to={theater.website} target="_blank">
                      {theater.name}
                    </Link>
                  </h2>

                  {tags.map(({ name }) => (
                    <div
                      className="inline-block text-xs font-bold bg-gray rounded-md border text-black px-2 py-1"
                      key={name}
                    >
                      {name}
                    </div>
                  ))}
                </div>

                {days.map(({ day, showtimes }) => (
                  <div key={day}>
                    {day.startsWith('lundi') && <div className="p-2"></div>}
                    <div className="flex flex-col gap-4 pb-6 pl-4 border-l-8 border-gray border-opacity-20">
                      <div className="flex flex-wrap capitalize">{day}</div>
                      <div className="flex gap-4 flex-wrap">
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
        <div className="fixed bottom-0 z-5 p-6 w-full max-w-screen-sm m-auto">
          <Link
            style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
            className="block items-center rounded-md bg-primary p-4 text-center"
            to={{ pathname: location.pathname }}
          >
            <>
              Enlever
              <span className="ml-2 mr-2 p-1 pl-2 pr-2 text-xs font-bold bg-black bg-opacity-20 rounded-full inline-block">
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
