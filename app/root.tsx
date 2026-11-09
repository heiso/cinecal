import type { PropsWithChildren } from 'react'
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from 'react-router'
import type { Route } from './+types/root'
import './app.css'
import { env } from './env.server'
import './font.css'

type ENV = {
  ENV: string
  BUILD_VERSION: string
}

declare global {
  interface Window {
    ENV: ENV
  }
}

// No ending slashes for SEO reasons
// https://github.com/epicweb-dev/epic-stack/discussions/108
const removeTrailingSlash: Route.MiddlewareFunction = ({ request }) => {
  const url = new URL(request.url)
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    throw redirect(`${url.pathname.slice(0, -1).replace(/\/+/g, '/')}${url.search}`, 301)
  }
}

export const middleware: Route.MiddlewareFunction[] = [removeTrailingSlash]

export function loader() {
  return {
    ENV: {
      ENV: env.ENV,
      BUILD_VERSION: env.BUILD_VERSION,
    } satisfies ENV,
  }
}

export const meta: Route.MetaFunction = () => [
  { title: 'Cinecal' },
  { property: 'description', content: 'Explorez le cinéma à votre rythme' },
]

export const links: Route.LinksFunction = () => [
  { rel: 'alternate icon', type: 'image/png', href: '/favicon-32x32.png' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/site.webmanifest', crossOrigin: 'use-credentials' },
]

export function Layout({ children }: PropsWithChildren) {
  return (
    <html lang="fr" className="dark bg-background w-full h-full text-white">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="w-full h-full max-w-(--breakpoint-sm) m-auto relative">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()

  return (
    <>
      <h1 className="text-center">Oops! I did it again</h1>

      {isRouteErrorResponse(error) && <div>Status: {error.status}</div>}

      <Link className="hover:underline" to="/">
        Go back
      </Link>
    </>
  )
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Outlet />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify(loaderData.ENV)}`,
        }}
      />
    </>
  )
}
