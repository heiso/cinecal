import { addRequestDataToEvent, captureException, init, withScope } from '@sentry/node'
import type { DefaultState } from 'koa'
import Koa from 'koa'
import { koaBody } from 'koa-body'
import serve from 'koa-static'
import { join } from 'path'
import { Context } from './core/context'
import { prismaMiddleware } from './core/prisma'
import { remixMiddleware } from './core/remix'
import { scraperMiddleware } from './scraper'

export const app = new Koa<DefaultState, Context>()

if (process.env.SENTRY_DSN) {
  init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.ENV,
  })

  process.on('unhandledRejection', (err) => {
    captureException(err)
  })

  process.on('uncaughtException', (err) => {
    captureException(err)
  })

  app.on('error', (err, ctx) => {
    withScope((scope) => {
      scope.addEventProcessor((event) => addRequestDataToEvent(event, ctx.request))
      captureException(err)
    })
  })
}

app.use(koaBody())
app.use(prismaMiddleware())
app.use(serve(join(process.cwd(), 'public')))
app.use(scraperMiddleware())
app.use(remixMiddleware())
