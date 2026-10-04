// Lower layers of the lil2 family are embedded as source, one sibling directory per layer under src/
// (src/micromark, src/mdast, src/hast, src/jsx, src/gfm, ...), copied byte for byte from their repos and
// pinned by hash. Every layer imports the others as `../<layer>/...`, so one copy of each serves all.
//   node scripts/shared-sources.mjs          check the pins
//   node scripts/shared-sources.mjs --sync   copy every layer from its repo and rewrite the pins
import {createHash} from 'node:crypto'
import {mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, statSync, existsSync} from 'node:fs'
import {dirname, join, relative, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pinFile = join(root, 'scripts/shared-sources.json')
const config = JSON.parse(readFileSync(pinFile, 'utf8'))
const hash = b => createHash('sha256').update(b).digest('hex')
const walk = d => readdirSync(d).flatMap(n => statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]).filter(f => f.endsWith('.lil'))
if (process.argv.includes('--sync')) {
  const pins = {}
  for (const [layer, from] of Object.entries(config.layers)) {
    const source = resolve(root, from), target = join(root, 'src', layer)
    if (!existsSync(source)) throw new Error(`${layer}: ${source} does not exist`)
    rmSync(target, {recursive: true, force: true})
    for (const file of walk(source)) {
      const rel = relative(source, file), bytes = readFileSync(file)
      mkdirSync(dirname(join(target, rel)), {recursive: true})
      writeFileSync(join(target, rel), bytes)
      pins[`${layer}/${rel}`] = hash(bytes)
    }
  }
  writeFileSync(pinFile, JSON.stringify({layers: config.layers, pins}, null, 2) + '\n')
  console.log(`synced ${Object.keys(pins).length} sources of ${Object.keys(config.layers).join(', ')}`)
} else {
  for (const [rel, expected] of Object.entries(config.pins)) {
    const actual = hash(readFileSync(join(root, 'src', rel)))
    if (actual !== expected) throw new Error(`src/${rel}: expected ${expected}, got ${actual}`)
  }
  for (const layer of Object.keys(config.layers)) {
    for (const file of walk(join(root, 'src', layer))) {
      if (!(relative(join(root, 'src'), file) in config.pins)) throw new Error(`${relative(root, file)} is not pinned`)
    }
  }
  console.log(`checked ${Object.keys(config.pins).length} pinned sources of ${Object.keys(config.layers).join(', ')}`)
}
