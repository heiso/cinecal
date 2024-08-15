import { PassThrough, Transform } from 'node:stream'

import type { AppLoadContext, DataFunctionArgs, EntryContext } from '@remix-run/node'
import { createReadableStreamFromReadable } from '@remix-run/node'
import { RemixServer } from '@remix-run/react'
import { isbot } from 'isbot'
import { renderToPipeableStream } from 'react-dom/server'

const ABORT_DELAY = 5_000

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext,
) {
  return isbot(request.headers.get('user-agent'))
    ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext)
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
      {
        onAllReady() {
          shellRendered = true
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)

          responseHeaders.set('Content-Type', 'text/html')

          /**
           * @url https://github.com/kentcdodds/kentcdodds.com/blob/438a18209a060c9f42ff7bd5b416044c69e0b237/app/entry.server.tsx#L109
           * find/replace all instances of the string "data-evt-" with ""
           * this is a bit of a hack because React won't render the "onload"
           * prop, which we use for blurrable image
           */
					const dataEvtTransform = new Transform({
						transform(chunk, encoding, callback) {
							const string = chunk.toString()
							const replaced = string.replace(/data-evt-/g, ``)
							callback(null, replaced)
						},
					})

          pipe(dataEvtTransform).pipe(body)

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          )
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          responseStatusCode = 500
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error)
          }
        },
      },
    )

    setTimeout(abort, ABORT_DELAY)
  })
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
      {
        async onShellReady() {
          shellRendered = true
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)

          responseHeaders.set('Content-Type', 'text/html')

          /**
           * @url https://github.com/kentcdodds/kentcdodds.com/blob/438a18209a060c9f42ff7bd5b416044c69e0b237/app/entry.server.tsx#L109
           * find/replace all instances of the string "data-evt-" with ""
           * this is a bit of a hack because React won't render the "onload"
           * prop, which we use for blurrable image
           */
					const dataEvtTransform = new Transform({
						transform(chunk, encoding, callback) {
							const string = chunk.toString()
							const replaced = string.replace(/data-evt-/g, ``)
							callback(null, replaced)
						},
					})

          pipe(dataEvtTransform).pipe(body)

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          )
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          responseStatusCode = 500
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error)
          }
        },
      },
    )

    setTimeout(abort, ABORT_DELAY)
  })
}

export async function handleDataRequest(response: Response, { request }: DataFunctionArgs) {
  return response
}

export function handleError(error: unknown, { request }: DataFunctionArgs): void {
  if (request.signal.aborted) return;
  
  console.error(error)
}
