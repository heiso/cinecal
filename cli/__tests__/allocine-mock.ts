import { readFileSync } from 'node:fs'
import { addDays, format } from 'date-fns'
import { http, HttpResponse } from 'msw'

const FIXTURES = `${import.meta.dirname}/fixtures/showtimes`

function fixturePath(day: number, page: number) {
  if (day === 0)
    return page === 1 ? `${FIXTURES}/theater-*.json` : `${FIXTURES}/theater-*/p-${page}.json`
  if (day === 1 && page > 1) return `${FIXTURES}/theater-*/d-1/p-${page}.json`
  if (day <= 6 && page === 1) return `${FIXTURES}/theater-*/d-${day}.json`
  return null
}

/** Showtime ids are made unique per theater, like real responses would be */
export function theaterShowtimeId(theaterId: string, internalId: number) {
  const theaterOffset = [...theaterId].reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7) % 1000
  return internalId + theaterOffset * 1_000_000_000
}

function toLocalDate(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Serves the recorded Allocine showtimes responses for any theater, day and
 * page. Showtimes are moved to the requested day (relative to `today`) and
 * their ids are made unique per theater, like real responses would be.
 */
export function allocineShowtimesHandler(today = new Date()) {
  return http.post('https://www.allocine.fr/_/showtimes/*', ({ request }) => {
    const match = new URL(request.url).pathname.match(
      /theater-([^/]+)\/(?:d-(\d{4}-\d{2}-\d{2})\/)?(?:p-(\d+)\/)?$/,
    )
    const [, theaterId, date, page] = match ?? []
    if (!theaterId) return new HttpResponse(null, { status: 404 })
    // Date-only strings parse as UTC midnight, so the difference is a whole number of days
    const day = date ? (Date.parse(date) - Date.parse(toLocalDate(today))) / 86_400_000 : 0
    const path = fixturePath(day, page ? Number(page) : 1)
    if (!path) {
      return HttpResponse.json({ error: true, message: 'no.showtime.error', results: [] })
    }

    const json = JSON.parse(readFileSync(path, 'utf-8'))
    const target = toLocalDate(addDays(today, day))
    for (const result of json.results) {
      for (const showtimes of Object.values(result.showtimes) as {
        startsAt: string
        internalId: number
      }[][]) {
        for (const showtime of showtimes) {
          showtime.startsAt = `${target}T${showtime.startsAt.slice(11)}`
          showtime.internalId = theaterShowtimeId(theaterId, showtime.internalId)
        }
      }
    }
    return HttpResponse.json(json)
  })
}
