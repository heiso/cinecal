export enum DATE_FILTER {
  DEFAULT = 'DEFAULT',
  TODAY = 'TODAY',
  THIS_WEEK = 'THIS_WEEK',
  NEXT_WEEK = 'NEXT_WEEK',
}

export const DATE_FILTER_LABELS: Record<DATE_FILTER, string> = {
  [DATE_FILTER.DEFAULT]: 'Peu importe quand',
  [DATE_FILTER.TODAY]: "Aujourd'hui",
  [DATE_FILTER.THIS_WEEK]: 'Cette semaine',
  [DATE_FILTER.NEXT_WEEK]: 'Semaine prochaine',
}

export enum CUSTOM_TAG {
  NEW_RELEASE = 'NEW_RELEASE',
  NEXT_RELEASE = 'NEXT_RELEASE',
}

export const CUSTOM_TAG_LABELS: Record<CUSTOM_TAG, string> = {
  [CUSTOM_TAG.NEW_RELEASE]: 'Sorties récentes',
  [CUSTOM_TAG.NEXT_RELEASE]: 'Prochainement',
}
