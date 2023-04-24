import { app } from './app'
import { log } from './core/logger'
import './core/process'

app.listen({ port: Number(process.env.PORT) }, () => {
  log.info(`🚀 To infinity...and beyond!`)
})
