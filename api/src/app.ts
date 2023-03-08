import type { DefaultContext, DefaultState } from 'koa'
import Koa from 'koa'
import { koaBody } from 'koa-body'
import { graphqlMiddleware } from './core/graphql'
import * as movies from './movies.schema'
import * as root from './root.schema'

export const app = new Koa<DefaultState, DefaultContext>()

export const graphqlOptions = {
  definitions: [root, movies],
  isSafelistEnabled: false,
}

app.use(koaBody())
app.use(graphqlMiddleware(graphqlOptions))
