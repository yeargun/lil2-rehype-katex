# lil2-rehype-katex

[rehype-katex](https://github.com/remarkjs/remark-math/tree/main/packages/rehype-katex) 7.0.1 rewritten in typed
[LilScript](https://lilscript.eddocu.com): every math element is rendered by [KaTeX](https://katex.org) and
KaTeX's HTML is read into the flat **lil2** hast arena, with the same tree as upstream.

KaTeX stays the `katex` package. What is rewritten is everything around it: finding the math, reading the
source text, the error fallback, and parsing KaTeX's HTML into hast (upstream: hast-util-from-html-isomorphic,
hastscript, property-information). Inside the family it is compiled into
[lil2-react-markdown](https://github.com/yeargun/lil2-react-markdown)'s `full` flavor.

## Integers, not strings

| upstream | lil2-rehype-katex |
|---|---|
| finds math by `className` (`language-math`, `math-inline`, `math-display`) | int flags set where the elements are made |
| KaTeX's tags as `tagName` strings | tag ids, interned into the family's tag table |
| attributes through property-information's tables at run time | KaTeX's 48 attributes (MathML, HTML, SVG, trusted commands) as property ids, with value kinds and JSX keys generated from property-information |
| `style` strings for React to parse | the JSX layer's typed port of style-to-js |

Parsing follows upstream in each environment. The browser build lets the document parse KaTeX's HTML (a
`<template>`, as upstream's browser graph does). Elsewhere a tokenizer reads the HTML KaTeX writes with the HTML
tokenizer's attribute rules (KaTeX's stray `'` after an `\includegraphics` image's style is an attribute, as for
parse5), character references, void elements and the MathML and SVG namespaces.

## In a chat app

This package is a layer of [lil2-react-markdown](https://github.com/yeargun/lil2-react-markdown), measured here as a whole: A chat of LLM-style replies (lists, code, tables, math, about 2.5 KB of markdown each), every reply streamed into the
page a few tokens at a time and rendered by React with GFM, math and KaTeX: react-markdown 10.1.0 with remark-gfm,
remark-math and rehype-katex → **this package's `/full` flavor**. Main-thread time, measured with Playwright in
Chromium 151, with Chrome's CPU throttling standing in for phones (4×: Lighthouse's mid-tier mobile; 6×: DevTools'
low-end mobile); median of 2 runs, libraries alternating, each in a fresh tab.

| | short chat (5 replies) | average chat (20 replies) | long chat (60 replies) |
|---|---:|---:|---:|
| CPU while the replies stream, mid-tier phone (4×) | 7.1 s → **3.2 s** (2.2×) | 29.1 s → **11.5 s** (2.5×) | 1.3 min → **31.0 s** (2.5×) |
| CPU while the replies stream, low-end phone (6×) | 11.2 s → **4.7 s** (2.4×) | 45.9 s → **17.7 s** (2.6×) | 2.0 min → **47.4 s** (2.5×) |
| CPU while the replies stream, this machine | 1.6 s → **0.8 s** (2.1×) | 6.8 s → **2.7 s** (2.5×) | 17.6 s → **7.0 s** (2.5×) |
| updates slower than a frame (16.7 ms), low-end phone (6×) | 125 → **6 of 1,053** | 671 → **6 of 4,615** | 1,318 → **67 of 12,897** |
| opening the saved chat, low-end phone (6×) | 417 ms → **317 ms** (1.3×) | 843 ms → **519 ms** (1.6×) | 1.77 s → **960 ms** (1.8×) |

Every streamed update renders exactly react-markdown's DOM ([`test/chat.test.mjs`](https://github.com/yeargun/lil2-react-markdown/blob/main/test/chat.test.mjs), Chromium and Firefox).
Reproduce with `npm run bench:chat` in lil2-react-markdown; the numbers are in [`bench/chat/results/mobile.json`](https://github.com/yeargun/lil2-react-markdown/blob/main/bench/chat/results/mobile.json).
The machine is one core of an AMD EPYC 7763; real phones vary.

## Install

```bash
npm install @itslil/lil2-rehype-katex
```

TypeScript types are included. One ES module per entry; Node, Deno, Bun and workers get `dist/`, bundlers targeting
browsers get `dist/browser/` through the `browser` condition.

## Use

```ts
import type {KatexOptions} from 'katex'
import {markdownToHast, propNames} from '@itslil/lil2-rehype-katex'
import {H_ELEMENT} from '@itslil/lil2-rehype-katex/constants'

const settings: KatexOptions = {macros: {'\\R': '\\mathbb{R}'}}
const tree = markdownToHast('Let $x \\in \\R$.', settings)
const [root, kind, , firstChild, nextSibling, tag, , , , , , propHead, propName, , propString, , propNext, , tagNames] = tree

// Walk from the root: the math elements KaTeX replaced stay in the arrays, unlinked.
function* walk(node = root): Generator<number> {
  yield node
  for (let child = firstChild[node]; child >= 0; child = nextSibling[child]) yield* walk(child)
}
// Tag and property names grow with what KaTeX writes: read them after the call.
const tags = new Set<string>(), classes = new Set<string>()
for (const node of walk()) {
  if (kind[node] !== H_ELEMENT) continue
  tags.add(tagNames[tag[node]])
  for (let p = propHead[node]; p >= 0; p = propNext[p]) if (propNames[propName[p]] === 'className') classes.add(propString[p])
}
console.log([...tags].slice(0, 6)) // [ 'p', 'span', 'math', 'semantics', 'mrow', 'mi' ]
console.log(classes.has('katex')) // true
```

`markdownToHast(value, settings?)` runs remark-parse, remark-math, remark-rehype and rehype-katex: every formula is
KaTeX's HTML, parsed into the columns (by the document in browsers, by an HTML tokenizer elsewhere). `settings` are
KaTeX's options, as rehype-katex takes them. Add KaTeX's stylesheet to the page: `import 'katex/dist/katex.min.css'`.

### Which package

| you want | package |
|---|---|
| React elements | [`@itslil/lil2-react-markdown`](https://github.com/yeargun/lil2-react-markdown) (`/gfm`, `/full` for GFM, math, KaTeX) |
| an HTML string, CommonMark | [`@itslil/lil2-micromark`](https://github.com/yeargun/lil2-micromark) |
| an HTML string with GFM, math or KaTeX | `renderToStaticMarkup` of lil2-react-markdown's `/full` flavor (below) |
| mdast (syntax tree) | [`lil2-mdast-util-from-markdown`](https://github.com/yeargun/lil2-mdast-util-from-markdown); with GFM [`lil2-remark-gfm`](https://github.com/yeargun/lil2-remark-gfm), math [`lil2-remark-math`](https://github.com/yeargun/lil2-remark-math), breaks [`lil2-remark-breaks`](https://github.com/yeargun/lil2-remark-breaks) |
| elements from hast columns through any JSX runtime | [`lil2-hast-util-to-jsx-runtime`](https://github.com/yeargun/lil2-hast-util-to-jsx-runtime) |
| hast (HTML tree) | [`lil2-mdast-util-to-hast`](https://github.com/yeargun/lil2-mdast-util-to-hast) and the same three, or [`lil2-rehype-katex`](https://github.com/yeargun/lil2-rehype-katex) with formulas rendered |

Every package is one self-contained ES module with no runtime dependencies (React and KaTeX aside), ships its
TypeScript types, and resolves to a Node build or a browser build through its `exports` conditions.
## Measured (2026-10-04)

The `browser` build against rehype-katex@7.0.1 bundled for the browser with esbuild and minified by Terser, esbuild and Oxc
(the smallest shown). Each objective is its own LilScript build (effort level 12, `lazy_functions`).

| | lil2 | upstream, best minifier | difference |
|---|---:|---:|---:|
| raw | 69,460 | 105,268 (Terser) | −34.0% |
| gzip (9) | 22,895 | 30,350 (Terser) | −24.6% |
| Brotli (11) | 19,848 | 26,829 (Terser) | −26.0% |

Speed, upstream → lil2: math rendered by KaTeX, median per call in a fresh browser context per lane, after checking that both
give the same output (Playwright; Chromium 151, Firefox 153; AMD EPYC 7763 64-Core Processor). Cold rows are the first import and the
first call of a fresh page.

| | Chromium | Firefox |
|---|---:|---:|
| math (1 KB) | 10.1 → 7.80 ms (0.77×) | 14.0 → 12.0 ms (0.86×) |
| import, cold | 29.0 → 23.1 ms | 47.0 → 42.0 ms |
| first call, cold | 41.0 → 40.4 ms | 48.0 → 44.0 ms |

## Behaviour

`test/differential.test.mjs` renders 182 formulas (fractions, roots, accents, arrays, stretchy delimiters,
SVG-drawn arrows and braces, colors, `\cancel`, errors, trusted `\href`, `\includegraphics` and `\html*`,
escapes, Unicode) as text math, display math and a ` ```math ` fence, plus a math document, under eight KaTeX
setting sets. Each hast is compared with upstream rehype-katex's as rows of indexed arrays: tags, every property
with its value type, text. `test/browser.test.mjs` runs the browser build in Chromium and Firefox. All are equal.

## License

MIT; see NOTICE.md.
