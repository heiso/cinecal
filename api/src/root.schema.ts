import { GraphQLScalarType } from 'graphql'
import { gql } from 'graphql-tag'
import GraphQLJSON from 'graphql-type-json'
import { Resolvers } from '../generated/graphql'

export const typeDefs = gql`
  enum ErrorCode {
    INTERNAL_SERVER_ERROR
    UNAUTHENTICATED
    FORBIDDEN
    BAD_USER_INPUT
  }

  type Query {
    noop: Boolean
  }

  type Mutation {
    noop: Boolean
  }

  type Subscription {
    noop: Boolean
  }

  directive @isPublic on FIELD_DEFINITION

  scalar JSON
  scalar Date
`

export const resolvers: Resolvers = {
  Query: {
    noop: () => true,
  },

  Mutation: {
    noop: () => true,
  },

  JSON: GraphQLJSON,
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    serialize(value) {
      if (value instanceof Date) {
        return value.toISOString()
      }
      return value
    },
  }),

  // Subscription: {
  //   noop: () => true,
  // },
}
