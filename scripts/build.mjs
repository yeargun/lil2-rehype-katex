// node scripts/build.mjs [--dev]
//   production: lilscript.toml -> dist/ and lilscript.browser.toml -> dist/browser/ (the `browser` condition:
//               named character references decoded by the document), both searched
//   --dev:      the same two builds, unsearched, into .dev/
// Each build's wall time goes to stderr ("built <config> in <s> s").
import {execFileSync} from 'node:child_process'
import {existsSync} from 'node:fs'
const compiler = process.env.LILSCRIPT_COMPILER ?? '/home/azureuser/lilscript-work/lil2/lilscript-lazyfn'
if (!existsSync(compiler)) throw new Error('Set LILSCRIPT_COMPILER to the pinned LilScript compiler')
const run = (config, out, mode) => {
  const start = process.hrtime.bigint()
  execFileSync(compiler, ['--config', config, '--target', 'js-module', '--mode', mode, '--out-dir', out, '--cache', 'off', '--jobs', '1'], {stdio: ['ignore', 'ignore', 'inherit']})
  console.error(`built ${config} in ${(Number(process.hrtime.bigint() - start) / 1e9).toFixed(2)} s`)
}
const dev = process.argv.includes('--dev')
for (const config of ['lilscript.toml', 'lilscript.browser.toml']) run(config, dev ? '.dev' : '.', dev ? 'development' : 'production')
