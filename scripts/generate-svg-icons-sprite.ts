// Builds one sprite per directory of svgs/ (public/<dir>.svg) and the matching id types (svgs.ts).
// Runs from the Vite config (dev and build) and as `npm run icons` before type checking.
// Both outputs are generated, so the formatter ignores them (.oxfmtrc.json).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

export const svgsDir = 'svgs'
const outputPath = 'public'
const outputTS = 'svgs.ts'

/** Writes only when the content changed, so the dev server does not reload for nothing */
function writeIfChanged(path: string, content: string) {
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return
  writeFileSync(path, content)
}

export function generateIconSprites() {
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
        .replace(/fill="[#|a-z|0-9]*"/gi, '')
        .trim(),
    )
    writeIfChanged(
      `${outputPath}/${dir}.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg">\n<defs>\n${symbols.join('\n')}\n</defs>\n</svg>\n`,
    )
  }

  const types = filesByDir
    .filter(({ ids }) => ids.length > 0)
    .map(({ dir, ids }) => {
      const name = `${dir.charAt(0).toUpperCase()}${dir.slice(1)}Svg`
      return `export const ${dir}Svgs = [${ids.map((id) => `'${id}'`).join(', ')}] as const
export type ${name} = (typeof ${dir}Svgs)[number]`
    })
    .join('\n')
  writeIfChanged(outputTS, `${types}\n`)
}

if (import.meta.main) generateIconSprites()
