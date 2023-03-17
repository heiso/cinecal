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

app.use(koaBody())
app.use(prismaMiddleware())
app.use(serve(join(process.cwd(), 'public')))
app.use(scraperMiddleware())
app.use(remixMiddleware())
