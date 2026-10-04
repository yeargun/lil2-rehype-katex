// node scripts/build.mjs [--dev]
//   production: lilscript.toml -> dist/ and lilscript.browser.toml -> dist/browser/ (the `browser` condition:
//               named character references decoded by the document), both searched
//   --dev:      the same two builds, unsearched, into .dev/
import {execFileSync} from 'node:child_process'
import {existsSync} from 'node:fs'
const compiler = process.env.LILSCRIPT_COMPILER ?? '/home/azureuser/lilscript-work/remark-fix/lilscript-8ff44f'
if (!existsSync(compiler)) throw new Error('Set LILSCRIPT_COMPILER to the pinned LilScript compiler')
const run = (config, out, mode) =>
  execFileSync(compiler, ['--config', config, '--target', 'js-module', '--mode', mode, '--out-dir', out, '--cache', 'off', '--jobs', '1'], {stdio: ['ignore', 'ignore', 'inherit']})
const dev = process.argv.includes('--dev')
for (const config of ['lilscript.toml', 'lilscript.browser.toml']) run(config, dev ? '.dev' : '.', dev ? 'development' : 'production')
