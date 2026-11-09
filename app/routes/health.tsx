import { env } from '../env.server'

export function loader() {
  return Response.json({
    build: env.BUILD_VERSION,
    shouldRefreshIfVersionMismatch: env.SHOULD_REFRESH_BROWSER_IF_VERSION_MISMATCH,
  })
}
