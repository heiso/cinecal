import { LinksFunction, V2_MetaFunction } from '@remix-run/node'
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react'
import styles from './styles.css'

export const meta: V2_MetaFunction = () => [
  { title: 'Cinecal' },
  { property: 'description', content: 'Explorez le cinéma à votre rythme' },
]

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

export default function App() {
  return (
    <html lang="fr" className="dark bg-background w-full h-full text-white xl:w-4/6 m-auto">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="w-full h-full">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}
