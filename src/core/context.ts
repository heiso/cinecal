import { PrismaClient } from '@prisma/client'
import { DefaultState, ParameterizedContext } from 'koa'
// import { Authentication } from './authentication'
// import { Session } from './session'
// import { Telemetry } from './telemetry'

type SessionData = {
  // userId?: User['id'] | null
}

export type Context = ParameterizedContext<
  DefaultState,
  {
    prisma: PrismaClient
    // session: Session<SessionData>
    // telemetry: Telemetry
    // auth: Authentication
    // user: User
  },
  Record<string, unknown> | String
>
