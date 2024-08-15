import { parseArgs } from 'util'
import { scrap } from './scraper.js'

const { positionals } = parseArgs({
  allowPositionals: true,
  args: process.argv,
})

const days = parseInt(positionals[0] || '90')

scrap(days)
