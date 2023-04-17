import { AppLoadContext } from '@remix-run/node'
import { createRequestHandler } from '@remix-run/server-runtime'
import type { DefaultState, Middleware } from 'koa'
import { join } from 'path'
import type { Context } from './context'

const BUILD_DIR = join(process.cwd(), 'build')

export function remixMiddleware(): Middleware<DefaultState, Context> {
  return async function remixMiddleware(ctx, next) {
    const handleRequest = createRequestHandler(require(BUILD_DIR), process.env.NODE_ENV)

    if (process.env.ENV === 'development') {
      // purge require cache on requests for "server side HMR" this won't let
      // you have in-memory objects between requests in development,
      // alternatively you can set up nodemon/pm2-dev to restart the server on
      // file changes, but then you'll have to reconnect to databases/etc on each
      // change. We prefer the DX of this, so we've included it for you by default
      for (const key in require.cache) {
        if (key.startsWith(BUILD_DIR)) {
          delete require.cache[key]
        }
      }
    }

    const headers = new Headers()
    Object.entries(ctx.headers).forEach(([key, values]) => {
      if (values != undefined) {
        if (Array.isArray(values)) {
          values.forEach((value) => headers.append(key, value))
        } else {
          headers.append(key, values)
        }
      }
    })

    const request = new Request(ctx.href, {
      method: ctx.method,
      headers,
      body: ctx.body ? (ctx.body as unknown as BodyInit) : null,
    })

    const response = await handleRequest(request, ctx as unknown as AppLoadContext)

    response.headers.forEach((value, key) => ctx.set(key, value))

    ctx.status = response.status
    ctx.body = await response.text()

    return next()
  }
}
