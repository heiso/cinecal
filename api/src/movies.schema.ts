import { gql } from 'graphql-tag'
import { Resolvers } from '../generated/graphql'
import { MockResolvers } from '../generated/graphql.mock'
import { AllocineResponse } from './core/allocine-reponse'

const ENDPOINT = 'https://www.allocine.fr/_/showtimes'
const MAX_DAY = 6
const THEATERS = [
  {
    allocineId: 'C0023',
    name: 'Le Brady',
  },
  // {
  //   allocineId: 'C0159',
  //   name: 'UGC ciné-cité les Halles',
  // },
  {
    allocineId: 'C0089',
    name: 'Max Linder Panorama',
  },
  {
    allocineId: 'C0065',
    name: 'Le Grand Rex',
  },
]

type Showtime = AllocineResponse['results'][0]['showtimes']['local'][0] & {
  theater: (typeof THEATERS)[0]
}
type Movie = AllocineResponse['results'][0]['movie'] & {
  showtimes: Showtime[]
}

export const typeDefs = gql`
  type Theater {
    name: String!
    address: String
  }

  type Showtime {
    date: Date!
    theater: Theater!
    meta: String
  }

  type Movie {
    title: String!
    originalTitle: String!
    synopsis: String
    durationHR: String!
    durationMinutes: Int!
    showtimes: [Showtime!]!
  }

  extend type Query {
    getMovies: [Movie!]!
  }
`

async function getMoviesFromAllocine(
  theater: (typeof THEATERS)[0] = THEATERS[0],
  day: number = 0,
  page: number = 1,
  movies: Record<Movie['internalId'], Movie> = {}
): Promise<Movie[]> {
  const pageParam = page > 1 ? `p-${page}/` : ''
  const dayParam = day > 0 ? `d-${day}/` : ''
  const url = `${ENDPOINT}/theater-${theater.allocineId}/${dayParam}${pageParam}`
  const res = await fetch(url, {
    method: 'post',
    headers: { 'content-type': 'json' },
  })
  const body = (await res.json()) as AllocineResponse

  body.results.forEach((result) => {
    const showtimes: Record<Showtime['internalId'], Showtime> = {}

    Object.keys(result.showtimes).forEach((key) => {
      ;(result.showtimes[key] as Showtime[]).forEach((showtime) => {
        if (!showtimes[showtime.internalId]) {
          showtimes[showtime.internalId] = { ...showtime, theater }
        }
      })
    })

    movies[result.movie.internalId] = {
      ...result.movie,
      showtimes: movies[result.movie.internalId]
        ? [...movies[result.movie.internalId].showtimes, ...Object.values(showtimes)]
        : Object.values(showtimes),
    }
  })

  if (Number(body.pagination.page) < body.pagination.totalPages) {
    return getMoviesFromAllocine(theater, day, page + 1, movies)
  }

  if (day < MAX_DAY) {
    return getMoviesFromAllocine(theater, day + 1, 1, movies)
  }

  if (THEATERS[THEATERS.indexOf(theater) + 1] !== undefined) {
    return getMoviesFromAllocine(THEATERS[THEATERS.indexOf(theater) + 1], 0, 1, movies)
  }

  return Object.values(movies)
}

export const resolvers: Resolvers = {
  Movie: {
    durationMinutes: (parent) => {
      const split = parent.durationHR?.split('h')
      if (!split) return 0
      return parseInt(split[0]) * 60 + parseInt(split[1])
    },
  },

  Query: {
    getMovies: async () => {
      const res = await getMoviesFromAllocine()

      return res.map((movie) => {
        return {
          title: movie.title,
          originalTitle: movie.originalTitle,
          synopsis: movie.synopsisFull,
          durationHR: movie.runtime,
          durationMinutes: 0,
          showtimes: movie.showtimes.map((showtime) => ({
            date: showtime?.startsAt,
            theater: {
              name: showtime.theater.name,
            },
          })),
        }
      })
    },
  },
}

export const mockResolvers: MockResolvers = {
  Query: {
    getMovies: () => {
      return [
        {
          title: 'coucou',
          durationHR: '1h30',
          showtimes: [
            {
              date: Date.now(),
              theater: {
                name: 'hooo',
              },
            },
          ],
        },
      ]
    },
  },
}
