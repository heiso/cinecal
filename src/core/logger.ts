import { createLogger, format, transports } from 'winston'

const defaultFormat = format.combine(
  format.errors({ stack: true }),
  format.timestamp({ format: 'HH:mm:ss' })
)

const developmentFormat = format.combine(
  defaultFormat,
  format.colorize(),
  format.printf(({ level, message, stack }) => {
    if (Array.isArray(message) && message.every((msg) => msg instanceof Error)) {
      return `${message.map((err: Error) => `[${level}]: ${err.message}\n${err.stack}\n \n`)}`
    }
    return `[${level}]: ${message}${stack ? `\n${stack}}\n` : ''}`
  })
)

export const log = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  handleExceptions: true,
  format:
    (process.env.NODE_ENV && ['development', 'test', 'ci'].includes(process.env.NODE_ENV)) || true // As long as we do not have any monitoring/log manager, we can use the development format in production
      ? developmentFormat
      : format.combine(defaultFormat, format.json()),
  transports: [new transports.Console()],
})
