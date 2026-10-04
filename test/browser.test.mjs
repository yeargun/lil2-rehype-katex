// The browser build (the `browser` condition) in real browsers: there KaTeX's HTML is parsed by the document
// (as upstream's browser graph does) and named references by the document too. Same hast as upstream.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import * as playwright from 'playwright-core'
import {corpus, settingSets} from './corpus.mjs'
import {fromColumns, fromObjects} from './rows-hast.mjs'
import {upstream} from './differential.test.mjs'
const artifact = new URL(process.env.LIL2_BROWSER_ARTIFACT ?? '../dist/browser/rehype-katex.js', import.meta.url)
const katexModule = new URL('../node_modules/katex/dist/katex.mjs', import.meta.url)
const cases = corpus()

for (const name of ['chromium', 'firefox']) {
  test(`browser build in ${name}: hast equals upstream`, async () => {
    const code = await readFile(artifact, 'utf8'), katex = await readFile(katexModule, 'utf8')
    const browser = await playwright[name].launch()
    try {
      const page = await browser.newPage()
      await page.route('http://lil2.test/**', route => {
        const url = route.request().url()
        if (url.endsWith('/module.js')) return route.fulfill({contentType: 'text/javascript', body: code})
        if (url.endsWith('/katex.mjs')) return route.fulfill({contentType: 'text/javascript', body: katex})
        return route.fulfill({contentType: 'text/html', body: '<!doctype html><script type="importmap">{"imports":{"katex":"/katex.mjs"}}</script><title>lil2</title>'})
      })
      await page.goto('http://lil2.test/')
      const out = await page.evaluate(async ({markdowns, settingSets}) => {
        console.warn = () => {}
        const lib = await import('/module.js')
        const trees = settingSets.map(s => markdowns.map(m => lib.markdownToHast(m, s ?? undefined)))
        return {trees, propNames: lib.propNames, keywordNames: lib.keywordNames}
      }, {markdowns: cases.map(c => c.markdown), settingSets: settingSets.map(s => s ?? null)})
      const failures = []
      settingSets.forEach((settings, s) => cases.forEach((c, i) => {
        try {
          assert.deepStrictEqual(fromColumns(out.trees[s][i], out.propNames, out.keywordNames), fromObjects(upstream(c.markdown, settings)))
        } catch (error) {
          failures.push({settings, name: c.name, error: String(error.message).slice(0, 800)})
        }
      }))
      if (failures.length) console.log(JSON.stringify({failures: failures.length, first: failures.slice(0, 2)}, null, 1))
      assert.equal(failures.length, 0)
    } finally {
      await browser.close()
    }
  })
}
