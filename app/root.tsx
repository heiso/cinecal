import { useEffect, type PropsWithChildren } from 'react'
import {
  href,
  isRouteErrorResponse,
  Link,
  Links,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from 'react-router'
import type { Route } from './+types/root'
import './app.css'
import { env } from './env.server'

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
  return { buildVersion: env.BUILD_VERSION }
}

// The build version is the one this page was rendered with: keep it across navigations
export function shouldRevalidate() {
  return false
}

export const links: Route.LinksFunction = () => [
  {
    rel: 'preload',
    href: '/fonts/Atkinson-Hyperlegible-Regular.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  { rel: 'icon', type: 'image/png', href: '/favicon-32x32.png' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/site.webmanifest', crossOrigin: 'use-credentials' },
]

export function Layout({ children }: PropsWithChildren) {
  return (
    <html lang="fr" className="dark h-full w-full bg-background text-white">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="description" content="Explorez le cinéma à votre rythme" />
        <Links />
      </head>
      <body className="relative m-auto h-full w-full max-w-(--breakpoint-sm)">
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
      <title>Cinecal</title>
      <h1 className="text-center">Oops! I did it again</h1>

      {isRouteErrorResponse(error) && <div>Status: {error.status}</div>}

      <Link className="hover:underline" to="/">
        Go back
      </Link>
    </>
  )
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { buildVersion } = loaderData

  // Reload the page when a new version was deployed while the tab was in the background
  useEffect(() => {
    async function reloadIfOutdated() {
      const response = await fetch(href('/health'))
      if (!response.ok) return
      const health: { build: string; shouldRefreshIfVersionMismatch: boolean } =
        await response.json()
      if (health.shouldRefreshIfVersionMismatch && health.build !== buildVersion) {
        window.location.reload()
      }
    }

    window.addEventListener('focus', reloadIfOutdated)
    return () => window.removeEventListener('focus', reloadIfOutdated)
  }, [buildVersion])

  return <Outlet />
}
