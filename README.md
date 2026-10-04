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

## Use

```js
import {markdownToHast, propNames, keywordNames} from '@itslil/lil2-rehype-katex'

markdownToHast('Euler: $e^{i\\pi} + 1 = 0$', {output: 'html'}) // hast columns, KaTeX options as upstream
```

## Behaviour

`test/differential.test.mjs` renders 182 formulas (fractions, roots, accents, arrays, stretchy delimiters,
SVG-drawn arrows and braces, colors, `\cancel`, errors, trusted `\href`, `\includegraphics` and `\html*`,
escapes, Unicode) as text math, display math and a ` ```math ` fence, plus a math document, under eight KaTeX
setting sets. Each hast is compared with upstream rehype-katex's as rows of indexed arrays: tags, every property
with its value type, text. `test/browser.test.mjs` runs the browser build in Chromium and Firefox. All are equal.

## License

MIT; see NOTICE.md.
