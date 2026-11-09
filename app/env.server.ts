import assert from 'node:assert'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENV: string
      PUBLIC_URL: string
      DATABASE_URL: string
      BUILD_VERSION?: string
      SHOULD_REFRESH_BROWSER_IF_VERSION_MISMATCH?: string
    }
  }
}

assert(process.env.ENV, 'ENV must be defined')
assert(process.env.PUBLIC_URL, 'PUBLIC_URL must be defined')
assert(process.env.DATABASE_URL, 'DATABASE_URL must be defined')

export const env = {
  ENV: process.env.ENV,
  PUBLIC_URL: process.env.PUBLIC_URL,
  // Set by the Docker image build (the git commit)
  BUILD_VERSION: process.env.BUILD_VERSION ?? process.env.NODE_ENV ?? 'development',
  SHOULD_REFRESH_BROWSER_IF_VERSION_MISMATCH: Boolean(
    process.env.SHOULD_REFRESH_BROWSER_IF_VERSION_MISMATCH &&
    process.env.SHOULD_REFRESH_BROWSER_IF_VERSION_MISMATCH !== 'false',
  ),
}
