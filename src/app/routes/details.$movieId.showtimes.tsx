import { Movie, Showtime as PrismaShowtime, Theater } from '@prisma/client'
import { json, LoaderArgs, Response } from '@remix-run/node'
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
          Movie: {
            select: {
              duration: true,
              title: true,
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

  return json({
    theaters: theaters.map((theater) => ({
      ...theater,
      Showtimes: theater.Showtimes.map((showtime) => ({
        ...showtime,
        date: format(showtime.date, `E dd LLL - HH'h'mm`, { locale: fr }),
        addToCalendarUrl: buildAddToCalendarURL(showtime, showtime.Movie, theater),
      })),
    })),
  })
}

export default function Showtimes() {
  const { theaters } = useLoaderData<typeof loader>()

  return (
    <div>
      {theaters?.map((theater) => (
        <div className="mt-4" key={theater.id}>
          <h2>{theater.name}</h2>
          {theater.Showtimes.map((showtime) => (
            <Link
              className="block"
              key={showtime.id}
              to={showtime.addToCalendarUrl}
              target="_blank"
            >
              {showtime.date} ({showtime.language}) {showtime.isPreview ? '(AvP) ' : ''}
              {showtime.tags.map((tag) => `(${tag})`).join(' ')}
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}
