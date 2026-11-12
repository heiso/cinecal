import { createCookie } from 'react-router'
import { DATE_FILTER } from './filters'
import type { Filters } from './filters.server'

const savedFiltersCookie = createCookie('filters', {
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
})

function toSearch(filters: Filters) {
  const search = new URLSearchParams()
  // No title: a search for one movie is not a lasting preference
  if (filters.date !== DATE_FILTER.DEFAULT) search.set('date', filters.date)
  for (const id of filters.movieTags) search.append('movieTags', String(id))
  for (const id of filters.showtimeTags) search.append('showtimeTags', String(id))
  for (const [tag, enabled] of Object.entries(filters.customTags)) {
    if (enabled) search.append('customTags', tag)
  }
  for (const id of filters.theaters) search.append('theaters', String(id))
  if (filters.afterWork) search.set('afterWork', 'on')
  return search.toString()
}

export function saveFilters(filters: Filters) {
  const search = toSearch(filters)
  return search
    ? savedFiltersCookie.serialize(search)
    : savedFiltersCookie.serialize('', { maxAge: 0 })
}

export async function getSavedFilters(request: Request): Promise<string | null> {
  const search: unknown = await savedFiltersCookie.parse(request.headers.get('Cookie'))
  return typeof search === 'string' && search ? search : null
}
