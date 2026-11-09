export const DATE_FILTER = {
  DEFAULT: 'DEFAULT',
  TODAY: 'TODAY',
  THIS_WEEK: 'THIS_WEEK',
  NEXT_WEEK: 'NEXT_WEEK',
} as const
export type DATE_FILTER = (typeof DATE_FILTER)[keyof typeof DATE_FILTER]

export const DATE_FILTER_LABELS: Record<DATE_FILTER, string> = {
  [DATE_FILTER.DEFAULT]: 'Peu importe quand',
  [DATE_FILTER.TODAY]: "Aujourd'hui",
  [DATE_FILTER.THIS_WEEK]: 'Cette semaine',
  [DATE_FILTER.NEXT_WEEK]: 'Semaine prochaine',
}

export const CUSTOM_TAG = {
  NEW_RELEASE: 'NEW_RELEASE',
  NEXT_RELEASE: 'NEXT_RELEASE',
  SCRAPED_RECENTLY: 'SCRAPED_RECENTLY',
} as const
export type CUSTOM_TAG = (typeof CUSTOM_TAG)[keyof typeof CUSTOM_TAG]

export const CUSTOM_TAG_LABELS: Record<CUSTOM_TAG, string> = {
  [CUSTOM_TAG.NEW_RELEASE]: 'Sorties récentes',
  [CUSTOM_TAG.NEXT_RELEASE]: 'Prochainement',
  [CUSTOM_TAG.SCRAPED_RECENTLY]: 'Récemment ajouté',
}
