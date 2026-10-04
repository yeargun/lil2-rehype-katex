// Runs a function against a built module in real browsers (Chromium and Firefox, through Playwright).
// The module is served at http://lil2.test/module.js; `run` executes in the page with `arg` and must
// return structured-cloneable data (lil2 returns indexed arrays, so it does).
import {readFile} from 'node:fs/promises'
import * as playwright from 'playwright-core'

export const browsers = ['chromium', 'firefox']

export async function inBrowser(name, artifact, run, arg) {
  const code = await readFile(artifact, 'utf8')
  const browser = await playwright[name].launch()
  try {
    const page = await browser.newPage()
    await page.route('http://lil2.test/**', route => route.fulfill(route.request().url().endsWith('.js')
      ? {contentType: 'text/javascript', body: code}
      : {contentType: 'text/html', body: '<!doctype html><title>lil2</title>'}))
    await page.goto('http://lil2.test/')
    return await page.evaluate(`(async () => { const lib = await import('/module.js'); return (${run.toString()})(lib, ${JSON.stringify(arg)}) })()`)
  } finally {
    await browser.close()
  }
}
