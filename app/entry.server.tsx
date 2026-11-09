import { PassThrough, Transform } from 'node:stream'
import { createReadableStreamFromReadable } from '@react-router/node'
import { isbot } from 'isbot'
import { renderToPipeableStream, type RenderToPipeableStreamOptions } from 'react-dom/server'
import { ServerRouter, type EntryContext, type HandleErrorFunction } from 'react-router'

export const streamTimeout = 5_000

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === 'HEAD') {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders })
  }

  return new Promise((resolve, reject) => {
    let shellRendered = false
    const userAgent = request.headers.get('user-agent')

    // Bots and SPA mode wait for all content to load before responding
    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? 'onAllReady' : 'onShellReady'

    // Abort the rendering stream after `streamTimeout` so it has time to flush down the rejected boundaries
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => abort(),
      streamTimeout + 1000,
    )

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId)
              timeoutId = undefined
              callback()
            },
          })
          const stream = createReadableStreamFromReadable(body)

          responseHeaders.set('Content-Type', 'text/html')

          /**
           * @url https://github.com/kentcdodds/kentcdodds.com/blob/438a18209a060c9f42ff7bd5b416044c69e0b237/app/entry.server.tsx#L109
           * Replace every "data-evt-" with "": React won't render the "onload" attribute,
           * which ProgressiveImg uses to reveal the image as soon as it is loaded.
           */
          const dataEvtTransform = new Transform({
            transform(chunk, _encoding, callback) {
              callback(null, chunk.toString().replace(/data-evt-/g, ''))
            },
          })

          pipe(dataEvtTransform).pipe(body)

          resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }))
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          responseStatusCode = 500
          // Errors during the initial shell render reject and get logged by handleDocumentRequest
          if (shellRendered) {
            console.error(error)
          }
        },
      },
    )
  })
}

export const handleError: HandleErrorFunction = (error, { request }) => {
  if (request.signal.aborted) return

  console.error(error)
}
