export interface Poster {
  __typename: string
  id: string
  internalId: number
  url: string
  path: string
}

export interface Seo {
  __typename: string
  browsable: boolean
  title: string | null
}

export interface Data {
  __typename: string
  seo: Seo
  productionYear: number
}

export interface UserRating {
  score: number
  count: number
}

export interface UserReview {
  count?: number
}

export interface PressReview {
  score: number
  count: number
}

export interface Metric {
  hits: number
  sessions: number
}

export interface Stats {
  userRating: UserRating
  userReview: UserReview
  pressReview: PressReview
  metric: Metric
  wantToSeeCount: number
}

export interface ReleaseDate {
  __typename: string
  date: string
  precision: string
}

export interface CompanyLimitation {
  id: string
  name: string
}

export interface ReleaseTags {
  tagTypes: string[]
  tagFlags: string[]
}

export interface Release {
  __typename: string
  releaseDate: ReleaseDate
  name: string
  certificate?: any
  companyLimitation: CompanyLimitation
  releaseTags: ReleaseTags
}

export interface Seo2 {
  __typename: string
  browsable: boolean
}

export interface Person {
  __typename: string
  internalId: number
  lastName: string
  firstName: string
  seo: Seo2
}

export interface Position {
  __typename: string
  name: string
  department: string
}

export interface Credit {
  person: Person
  position: Position
  rank: number
}

export interface Seo3 {
  __typename: string
  browsable: boolean
}

export interface Actor {
  __typename: string
  internalId: number
  lastName: string
  firstName: string
  seo: Seo3
}

export interface Seo4 {
  __typename: string
  browsable: boolean
}

export interface OriginalVoiceActor {
  __typename: string
  internalId: number
  lastName: string
  firstName: string
  seo: Seo4
}

export interface Node {
  actor: Actor
  voiceActor?: any
  originalVoiceActor: OriginalVoiceActor
  rank: number
}

export interface Edge {
  node: Node
}

export interface Seo5 {
  __typename: string
  browsable: boolean
}

export interface Actor2 {
  __typename: string
  internalId: number
  lastName: string
  firstName: string
  seo: Seo5
}

export interface Seo6 {
  __typename: string
  browsable: boolean
}

export interface OriginalVoiceActor2 {
  __typename: string
  internalId: number
  lastName: string
  firstName: string
  seo: Seo6
}

export interface Node2 {
  actor: Actor2
  voiceActor?: any
  originalVoiceActor: OriginalVoiceActor2
  rank: number
}

export interface Cast {
  __typename: string
  edges: Edge[]
  nodes: Node2[]
}

export interface Country {
  __typename: string
  id: number
  name: string
  localizedName: string
}

export interface Movie2 {
  title: string
  subTitle: string
  description: string
}

export interface Series {
  title: string
  subTitle?: any
  description: string
}

export interface UserRating2 {
  movie: Movie2
  series: Series
}

export interface Movie3 {
  title?: any
  subTitle?: any
  description?: any
}

export interface Series2 {
  title?: any
  subTitle?: any
  description?: any
}

export interface PressRating {
  movie: Movie3
  series: Series2
}

export interface Movie4 {
  title?: any
  subTitle?: any
  description?: any
}

export interface Series3 {
  title?: any
  subTitle?: any
  description?: any
}

export interface Popularity {
  movie: Movie4
  series: Series3
}

export interface Movie5 {
  title?: any
  subTitle?: any
  description?: any
}

export interface Series4 {
  title?: any
  subTitle?: any
  description?: any
}

export interface Ranking {
  movie: Movie5
  series: Series4
}

export interface Scope {
  userRating: UserRating2
  pressRating: PressRating
  popularity: Popularity
  ranking: Ranking
}

export interface Seo7 {
  browsable: boolean
  friendly: boolean
  scope: Scope
}

export interface Data2 {
  seo: Seo7
}

export interface Tags {
  list: string[]
}

export interface RelatedTag {
  __typename: string
  internalId: number
  name: string | { id: string; tag: string; translate: string }
  scope: string
  data: Data2
  tags: Tags
}

export interface Flags {
  hasDvdRelease: boolean
  hasNews: boolean
  hasOnlineProduct: boolean
  hasOnlineRelease: boolean
  hasPhysicalProduct: boolean
  hasPreview: boolean
  hasShowtime: boolean
  hasSoundtrack: boolean
  hasTheaterRelease: boolean
  hasTrivia: boolean
  isClub300Approved: boolean
  isComingSoon: boolean
  isPlayingNow: boolean
  tvRelease: boolean
}

export interface CustomFlags {
  isPremiere: boolean
  weeklyOuting: boolean
}

export interface Movie {
  synopsis: string
  __typename: string
  internalId: number
  poster: Poster
  title: string
  originalTitle: string
  type: string
  runtime: number
  genres: string[] | { id: number; translate: string; tag: string }[]
  languages: string[]
  data: Data
  stats: Stats
  editorialReviews: any[]
  releases: Release[]
  /**
   * @todo
   * @fixme
   * This is not anymore a valid type according to the allocine api response
   */
  credits: Credit[]
  cast: Cast
  countries: Country[]
  relatedTags: RelatedTag[]
  flags: Flags
  customFlags: CustomFlags
}

export interface Ticketing {
  __typename: string
  urls: string[]
  type: string
  provider: string
}

export interface Data3 {
  __typename: string
  ticketing: Ticketing[]
}

export interface Original {
  __typename: string
  internalId: number
  startsAt: Date
  timeBeforeStart: string
  service?: any
  experience?: any
  comfort?: any
  projection: string[]
  picture?: any
  sound?: any
  tags: string[]
  data: Data3
  isPreview: boolean
  isWeeklyMovieOuting: boolean
}

export interface Ticketing2 {
  __typename: string
  urls: string[]
  type: string
  provider: string
}

export interface Data4 {
  __typename: string
  ticketing: Ticketing2[]
}

export interface Local {
  __typename: string
  internalId: number
  startsAt: Date
  timeBeforeStart: string
  service?: any
  experience?: any
  comfort?: any
  projection: string[]
  picture?: any
  sound?: any
  tags: string[]
  data: Data4
  isPreview: boolean
  isWeeklyMovieOuting: boolean
}

export interface Ticketing3 {
  __typename: string
  urls: string[]
  type: string
  provider: string
}

export interface Data5 {
  __typename: string
  ticketing: Ticketing3[]
}

export interface Multiple {
  __typename: string
  internalId: number
  startsAt: Date
  timeBeforeStart: string
  service?: any
  experience?: any
  comfort?: any
  projection: string[]
  picture?: any
  sound?: any
  tags: string[]
  data: Data5
  isPreview: boolean
  isWeeklyMovieOuting: boolean
}

export interface Showtimes {
  dubbed: any[]
  original: Original[]
  local: Local[]
  multiple: Multiple[]
}

export interface Result {
  movie: Movie | null
  showtimes: Showtimes
}

export interface Params {
  experience?: any
  projection?: any
  comfort?: any
  picture?: any
  sound?: any
  version?: any
  page: number
}

export interface Translation {
  tag: string
  name: string
}

export interface Value {
  key: string
  translation: Translation
  version: string
}

export interface Facet {
  __typename: string
  name: string
  values: Value[]
}

export interface Facets {
  facets: Facet[]
}

export interface Pagination {
  page: number | string
  totalPages: number
  itemsPerPage: number
  totalItems: number
}

export interface AllocineResponse {
  error: boolean
  message: string
  results: Result[]
  nextDate: string
  params: Params
  facets: Facets
  pagination: Pagination
  data?: any
}
