// Same hast as upstream rehype-katex (after micromark-extension-math, mdast-util-math and mdast-util-to-hast),
// compared as rows of indexed arrays, under several KaTeX settings.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {math} from 'micromark-extension-math'
import {mathFromMarkdown} from 'mdast-util-math'
import {toHast} from 'mdast-util-to-hast'
import rehypeKatex from 'rehype-katex'
import {VFile} from 'vfile'
import {corpus, settingSets} from './corpus.mjs'
import {fromColumns, fromObjects} from './rows-hast.mjs'
const lib = await import(new URL(process.env.LIL2_ARTIFACT ?? '../.dev/dist/rehype-katex.js', import.meta.url))
const silence = console.warn
console.warn = () => {}

export function upstream(markdown, settings) {
  const tree = toHast(fromMarkdown(markdown, {extensions: [math()], mdastExtensions: [mathFromMarkdown()]}))
  rehypeKatex(settings)(tree, new VFile())
  return tree
}

for (const settings of settingSets) {
  test(`hast equals upstream (settings: ${JSON.stringify(settings)})`, () => {
    const failures = []
    for (const c of corpus()) {
      try {
        const actual = fromColumns(lib.markdownToHast(c.markdown, settings), lib.propNames, lib.keywordNames)
        assert.deepStrictEqual(actual, fromObjects(upstream(c.markdown, settings)))
      } catch (error) {
        failures.push({name: c.name, markdown: c.markdown.slice(0, 160), error: String(error.message).slice(0, 1200)})
      }
    }
    if (failures.length) console.log(JSON.stringify({failures: failures.length, first: failures.slice(0, 2)}, null, 1))
    assert.equal(failures.length, 0)
  })
}
