import assert from 'assert'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      ENV: 'development' | 'production' | 'test'
      LOG_LEVEL: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly'
      PORT: string
      REDIS_URL: string | undefined
      DATABASE_URL: string
      IMAGEKIT_API_KEY: string
      THEMOVIEDBID_API_KEY: string | undefined
    }
  }
}

process.env.ENV = process.env.ENV ? process.env.ENV : process.env.NODE_ENV
process.env.LOG_LEVEL = 'info'
assert(process.env.PORT, 'PORT must be defined')
// assert(process.env.REDIS_URL, 'REDIS_URL must be defined')
assert(process.env.DATABASE_URL, 'DATABASE_URL must be defined')
assert(process.env.IMAGEKIT_API_KEY, 'IMAGEKIT_API_KEY must be defined')
// assert(process.env.THEMOVIEDBID_API_KEY, 'THEMOVIEDBID_API_KEY must be defined')
