import { gql } from 'graphql-tag'
import { testMoviesQuery } from '../../generated/graphql.test'
import { getArgs } from '../core/__tests__/graphql'

gql`
  query Movies {
    getMovies {
      title
      durationHR
      durationMinutes
      showtimes {
        date
        theater {
          name
        }
      }
    }
  }
`

describe('Movies', () => {
  it('should be true', async () => {
    jest.setTimeout(1000 * 30)
    const result = await testMoviesQuery(await getArgs())

    expect(result.data?.getMovies).toBeTruthy()
  })
})
