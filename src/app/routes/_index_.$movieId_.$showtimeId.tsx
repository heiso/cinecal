import BackIcon from '@heroicons/react/20/solid/XMarkIcon'
import { LoaderArgs, Response, V2_MetaFunction, json } from '@remix-run/node'
import { Link, useLoaderData, useNavigate } from '@remix-run/react'
import { add, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect } from 'react'
import { Context } from '../../core/context'
import { getPosterSrc } from '../poster.server'

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

  if (!params.showtimeId || isNaN(Number(params.showtimeId))) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
  }

  const showtimeId = Number(params.showtimeId)

  const showtime = await ctx.prisma.showtime.findFirst({
    where: { id: showtimeId },
    select: {
      id: true,
      date: true,
      language: true,
      Movie: {
        select: {
          id: true,
          title: true,
          duration: true,
          synopsis: true,
          posterUrl: true,
          posterBlurHash: true,
        },
      },
      Tags: {
        select: {
          id: true,
          name: true,
        },
      },
      Theater: {
        select: {
          id: true,
          name: true,
          website: true,
          address: true,
        },
      },
      Prices: {
        select: {
          id: true,
          label: true,
          price: true,
          description: true,
        },
      },
      ticketingUrl: true,
    },
  })

  if (showtime == null) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
  }

  const { src } = getPosterSrc(showtime.Movie.posterUrl, showtime.Movie.posterBlurHash)

  const url = new URL('https://calendar.google.com/calendar/event')
  url.searchParams.append('action', 'TEMPLATE')
  url.searchParams.append(
    'dates',
    `${format(showtime.date, GOOGLE_CALENDAR_DATE_FORMAT)}/${format(
      add(showtime.date, { minutes: showtime.Movie.duration }),
      GOOGLE_CALENDAR_DATE_FORMAT
    )}`
  )
  url.searchParams.append('text', `${showtime.Theater.name} - ${showtime.Movie.title}`)
  url.searchParams.append('location', showtime.Theater.address)
  if (showtime.Tags.length) {
    url.searchParams.append(
      'details',
      `Ticket: <a href="${showtime.ticketingUrl}">${
        showtime.ticketingUrl
      }</a>\nTags: ${showtime.Tags.map(({ name }) => name).join(', ')}`
    )
  }

  const addToCalendarUrl = url.toString()

  return json(
    {
      movie: {
        ...showtime.Movie,
        src,
      },

      showtime: {
        id: showtime.id,
        day: format(showtime.date, `EEEE dd LLLL`, { locale: fr }),
        date: format(showtime.date, `HH'h'mm`, { locale: fr }),
        language: showtime.language,
        tags: [{ id: showtime.language, name: showtime.language }, ...showtime.Tags],
        ticketingUrl: showtime.ticketingUrl,
        addToCalendarUrl,
        prices: showtime.Prices,
      },
    },
    {
      headers: {
        'Cache-Control': 'max-age=3600, public',
      },
    }
  )
}

export default function Index() {
  const { showtime, movie } = useLoaderData<typeof loader>()
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
        <Link to={{ pathname: `/${movie.id}` }} className="w-fit absolute z-10">
          <BackIcon className="h-8" />
        </Link>

        <div className="p6 mt-8">
          <div>
            {showtime.tags.map((tag) => (
              <div
                key={tag.id}
                className="inline-block text-xs border-gray rounded-md border text-gray p-1 w-fit"
              >
                {tag.name}
              </div>
            ))}
          </div>
          <div>{showtime.date}</div>
          <div>
            {showtime.prices.map(({ id, label, price, description }) => (
              <div key={id}>
                {label} {price}€<div className="text-xs">{description}</div>
              </div>
            ))}
          </div>
          {showtime.ticketingUrl && (
            <div>
              <Link
                key={showtime.id}
                to={showtime.ticketingUrl}
                target="_blank"
                className="text-primary"
              >
                Aller sur la page de reservation
              </Link>
            </div>
          )}
          <div>
            <Link
              key={showtime.id}
              to={showtime.addToCalendarUrl}
              target="_blank"
              className="text-primary"
            >
              Ajouter à son agenda
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
