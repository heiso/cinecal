// Builds one sprite per directory of svgs/ (public/<dir>.svg) and the matching id types (svgs.ts)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { format, resolveConfig } from 'prettier'

const svgsDir = 'svgs'
const outputPath = 'public'
const outputTS = 'svgs.ts'

const prettierConfig = await resolveConfig(process.cwd())

const filesByDir = readdirSync(svgsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map(({ name: dir }) => ({
    dir,
    ids: readdirSync(`${svgsDir}/${dir}`)
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.replace('.svg', '')),
  }))

for (const { dir, ids } of filesByDir) {
  const symbols = ids.map((id) =>
    readFileSync(`${svgsDir}/${dir}/${id}.svg`, 'utf8')
      .replace('<svg', `<symbol id="${id}"`)
      .replace('</svg>', '</symbol>')
      .replace(/fill="[#|a-z|0-9]*"/gi, ''),
  )
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg"><defs>${symbols.join('\n')}</defs></svg>`
  writeFileSync(
    `${outputPath}/${dir}.svg`,
    await format(sprite, { ...prettierConfig, parser: 'html' }),
  )
}

const types = filesByDir
  .filter(({ ids }) => ids.length > 0)
  .map(({ dir, ids }) => {
    const name = `${dir.charAt(0).toUpperCase()}${dir.slice(1)}Svg`
    return `export const ${dir}Svgs = [${ids.map((id) => `'${id}'`).join(',')}] as const
      export type ${name} = (typeof ${dir}Svgs)[number]`
  })
  .join('\n')
writeFileSync(outputTS, await format(types, { ...prettierConfig, parser: 'typescript' }))
