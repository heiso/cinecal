import { readdirSync, readFileSync } from 'fs'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { resolve } from 'path'
import { scrap } from '../scraper'

function getPaths(basePath: string, paths: string[] = []) {
  readdirSync(basePath, { withFileTypes: true }).map((dirent) => {
    const path = resolve(`${basePath}/${dirent.name}`)
    if (dirent.isDirectory()) {
      getPaths(path, paths)
    } else {
      paths.push(path)
    }
  })

  return paths
}

const server = setupServer(
  ...getPaths(`${__dirname}/fixtures`).map((path) => {
    const json = readFileSync(path, { encoding: 'utf-8' })
    const url = `https://www.allocine.fr/_/${path
      .replace(`${__dirname}/fixtures/`, '')
      .replace('.json', '')}`
    return rest.post(url, (req, res, ctx) => res(ctx.json(JSON.parse(json))))
  })
)

beforeAll(() => server.listen())

afterEach(() => server.resetHandlers())

afterAll(() => server.close())

describe('scrap-allocine', () => {
  it('should match snapshot', async () => {
    await scrap()
    // expect(result.data?.getMovies).toMatchSnapshot()
  })
})
