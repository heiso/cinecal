import { Movie, Showtime as PrismaShowtime, Theater } from '@prisma/client'
import { LoaderArgs, Response, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { add, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Context } from '../../core/context'

const GOOGLE_CALENDAR_DATE_FORMAT = "yyyyMMdd'T'HHmmss"

export function buildAddToCalendarURL(
  showtime: Pick<PrismaShowtime, 'date' | 'tags' | 'ticketingUrl'>,
  movie: Pick<Movie, 'duration' | 'title'>,
  theater: Pick<Theater, 'name' | 'address'>
) {
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
  if (showtime.tags) {
    url.searchParams.append(
      'details',
      `Ticket: <a href="${showtime.ticketingUrl}">${
        showtime.ticketingUrl
      }</a>\nTags: ${showtime.tags.join(', ')}`
    )
  }

  return url.toString()
}

export const loader = async ({ context, params }: LoaderArgs) => {
  const ctx = context as unknown as Context

  if (!params.movieId || isNaN(Number(params.movieId))) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
  }

  const theaters = await ctx.prisma.theater.findMany({
    where: {
      Showtimes: {
        some: {
          movieId: Number(params.movieId),
          date: { gte: new Date() },
        },
      },
    },
    select: {
      id: true,
      name: true,
      address: true,
      Showtimes: {
        where: {
          movieId: Number(params.movieId),
          date: { gte: new Date() },
        },
        select: {
          id: true,
          date: true,
          tags: true,
          ticketingUrl: true,
          isPreview: true,
          language: true,
          Prices: {
            select: {
              label: true,
              price: true,
            },
          },
          Movie: {
            select: {
              duration: true,
              title: true,
              tags: true,
            },
          },
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

  function mapShowtime(
    showtime: (typeof theaters)[0]['Showtimes'][0],
    theater: (typeof theaters)[0]
  ) {
    return {
      ...showtime,
      hour: format(showtime.date, `HH'h'mm`, { locale: fr }),
      addToCalendarUrl: buildAddToCalendarURL(showtime, showtime.Movie, theater),
      tags: [
        ...new Set([
          ...showtime.tags,
          ...showtime.Movie.tags,
          ...(showtime.isPreview ? ['Avant première'] : []),
        ]),
      ],
    }
  }

  return json({
    theaters: theaters.map((theater) => ({
      ...theater,
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
    })),
  })
}

export default function Showtimes() {
  const { theaters } = useLoaderData<typeof loader>()

  return (
    <div>
      {theaters?.map((theater) => (
        <div key={theater.id}>
          <h2 className="text-center m-4 font-medium text-lg">{theater.name}</h2>
          {theater.days.map(({ day, showtimes }) => (
            <div key={day} className="mb-8">
              <div className="text-sm mb-4">{day}</div>
              <div className="pl-4 w-full">
                <table className="table-auto w-full">
                  <tbody>
                    {showtimes.map((showtime) => (
                      <tr key={showtime.id}>
                        <td className="text-sm">{showtime.hour}</td>
                        <td className="space-x-2 pt-2 pb-2 ">
                          <div className="inline-block text-xs border-gray rounded-md border text-gray p-1 w-fit">
                            {showtime.language}
                          </div>
                          {showtime.tags.map((tag) => (
                            <div
                              key={tag}
                              className="inline-block text-xs border-gray rounded-md border text-gray p-1 w-fit"
                            >
                              {tag}
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
  )
}
