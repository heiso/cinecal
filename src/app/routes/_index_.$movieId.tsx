import BackIcon from '@heroicons/react/20/solid/XMarkIcon'
import { TagCategory } from '@prisma/client'
import { json, LoaderArgs, Response, V2_MetaFunction } from '@remix-run/node'
import { Link, useLoaderData, useLocation, useNavigate } from '@remix-run/react'
import { add, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect } from 'react'
import { Context } from '../../core/context'
import { getFilters, getWhereInputs } from '../filters.server'
import { getPosterSrc } from '../poster.server'
import { ProgressiveImg } from '../progressiveImg'

const GOOGLE_CALENDAR_DATE_FORMAT = "yyyyMMdd'T'HHmmss"

export const meta: V2_MetaFunction<typeof loader> = ({ data, location }) => {
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

export const loader = async ({ context, params, request }: LoaderArgs) => {
  const ctx = context as unknown as Context

  if (!params.movieId || isNaN(Number(params.movieId))) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
  }

  const filters = getFilters(request)
  const where = getWhereInputs(filters)

  const movieId = Number(params.movieId)

  const movie = await ctx.prisma.movie.findFirst({
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

  const theaters = await ctx.prisma.theater.findMany({
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
    theater: (typeof theaters)[0]
  ) => {
    const url = new URL('https://calendar.google.com/calendar/event')
    url.searchParams.append('action', 'TEMPLATE')
    url.searchParams.append(
      'dates',
      `${format(showtime.date, GOOGLE_CALENDAR_DATE_FORMAT)}/${format(
        add(showtime.date, { minutes: movie.duration }),
        GOOGLE_CALENDAR_DATE_FORMAT
      )}`
    )
    url.searchParams.append('text', `${theater.name} - ${movie.title}`)
    url.searchParams.append('location', theater.address)
    if (showtime.Tags.length) {
      url.searchParams.append(
        'details',
        `Ticket: <a href="${showtime.ticketingUrl}">${
          showtime.ticketingUrl
        }</a>\nTags: ${showtime.Tags.map(({ name }) => name).join(', ')}`
      )
    }

    const addToCalendarUrl = url.toString()

    return {
      id: showtime.id,
      date: format(showtime.date, `HH'h'mm`, { locale: fr }),
      language: showtime.language,
      tags: showtime.Tags,
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
          const item = acc.find((item) => item.day === day)
          const extendedShowtime = mapShowtime(showtime, theater)
          if (item) {
            item.showtimes.push(extendedShowtime)
          } else {
            acc.push({ day, showtimes: [extendedShowtime] })
          }
          return acc
        }, []),
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
          (event.target as HTMLElement).tagName.toLocaleLowerCase()
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
        <Link to={{ pathname: '/' }} className="w-fit absolute z-10">
          <BackIcon className="h-8" />
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

        <div className="relative z-1 space-y-4">
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

          <p className="text-white text-sm">{movie.synopsis}</p>
        </div>

        {theaters?.map((theater) => (
          <div key={theater.id}>
            <h2 className="text-center m-4 font-medium text-lg">
              <Link to={theater.website} target="_blank">
                {theater.name}
              </Link>
            </h2>
            {theater.days.map(({ day, showtimes }) => (
              <div key={day} className="mb-8">
                <div className="text-sm mb-4">{day}</div>
                <div className="pl-4 w-full">
                  <table className="table-auto w-full">
                    <tbody>
                      {showtimes.map((showtime) => (
                        <tr key={showtime.id}>
                          <td className="text-sm">{showtime.date}</td>
                          <td className="space-x-2 pt-2 pb-2 ">
                            <div className="inline-block text-xs border-gray rounded-md border text-gray p-1 w-fit">
                              {showtime.language}
                            </div>
                            {showtime.tags.map((tag) => (
                              <div
                                key={tag.id}
                                className="inline-block text-xs border-gray rounded-md border text-gray p-1 w-fit"
                              >
                                {tag.name}
                              </div>
                            ))}
                          </td>
                          {/* {showtime.Prices.map(({ label, price }) => `(${label}: ${price}€)`).join(' ')} */}
                          <td className="text-right text-primary">
                            {showtime.ticketingUrl && (
                              <Link key={showtime.id} to={showtime.ticketingUrl} target="_blank">
                                rez
                              </Link>
                            )}
                          </td>
                          <td className="text-right text-primary">
                            <Link key={showtime.id} to={showtime.addToCalendarUrl} target="_blank">
                              cal
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
