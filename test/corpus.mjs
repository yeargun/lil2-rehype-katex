// The KaTeX corpus: every formula of formulas.mjs as text math, display math and a ```math fence (with errors,
// trusted commands, escapes, Unicode and characters HTML escapes), a chat-style math document, and markdown with
// no math at all.
import {readFileSync} from 'node:fs'
import {formulas} from './formulas.mjs'

export function corpus() {
  const cases = []
  formulas.forEach((f, i) => {
    cases.push({name: `inline ${i + 1}`, markdown: `Before $${f}$ after.`})
    cases.push({name: `display ${i + 1}`, markdown: `$$\n${f}\n$$`})
    cases.push({name: `fence ${i + 1}`, markdown: '```math\n' + f + '\n```'})
  })
  cases.push({name: 'math document', markdown: readFileSync(new URL('math-doc.md', import.meta.url), 'utf8')})
  cases.push({name: 'no math', markdown: '# Title\n\nSome *text* and `code`.\n\n```js\nx\n```'})
  cases.push({name: 'nested', markdown: '> - $a$ and $$b$$\n>   ```math\n>   c\n>   ```'})
  return cases
}

// rehype-katex options (KaTeX's), as both sides get them.
export const settingSets = [undefined, {output: 'mathml'}, {output: 'html'}, {errorColor: '#00f'}, {trust: true}, {strict: 'ignore'}, {macros: {'\\R': '\\mathbb{R}'}}, {throwOnError: true}]
