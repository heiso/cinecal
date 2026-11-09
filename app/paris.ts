import { tz } from '@date-fns/tz'

/**
 * The cinemas are in Paris, so days, weeks and showtime hours are Paris time,
 * whatever the time zone of the server or of the visitor.
 * Pass it to date-fns as `{ in: paris }`.
 */
export const paris = tz('Europe/Paris')

/**
 * date-fns returns a TZDate when given `{ in: paris }`. Prisma would store a
 * TZDate's Paris wall clock as if it were UTC, so convert before querying.
 */
export function toDate(date: Date) {
  return new Date(date.getTime())
}
