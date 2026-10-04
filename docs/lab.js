// The live lab: markdown on the left; on the right, lil2-react-markdown's full flavor renders it in this page.
// "Race" times this page's package on the current text, upstream against lil2, both loaded here.
import {createElement, renderToString} from './lab/vendor.mjs'
import {Markdown, GFM, MATH, KATEX, BREAKS} from './lab/lil2-full.mjs'

const config = await fetch('./lab/config.json').then(response => response.json())
const input = document.querySelector('#lab-input')
const output = document.querySelector('#lab-output')
const toggles = [...document.querySelectorAll('[data-plugin]')]
const ids = {gfm: GFM, math: MATH, katex: KATEX, breaks: BREAKS}

function render() {
  const plugins = toggles.filter(t => t.checked).map(t => ids[t.dataset.plugin])
  const start = performance.now()
  output.innerHTML = renderToString(createElement(Markdown, {plugins}, input.value))
  document.querySelector('#render-ms').textContent = `rendered in ${(performance.now() - start).toFixed(2)} ms`
}
input.addEventListener('input', render)
for (const toggle of toggles) toggle.addEventListener('change', render)
for (const sample of document.querySelectorAll('[data-sample]')) {
  sample.addEventListener('click', async () => {
    input.value = await fetch(`./lab/samples/${sample.dataset.sample}.md`).then(r => r.text())
    render()
  })
}
render()

document.querySelector('#race').addEventListener('click', async () => {
  const out = document.querySelector('#race-out')
  out.textContent = 'loading both builds…'
  const [upstream, lil2] = await Promise.all([import(config.upstream), import(config.lil2)])
  const text = input.value
  const time = run => {
    let n = 0
    const start = performance.now()
    while (performance.now() - start < 400) { run(text); n++ }
    return (performance.now() - start) / n
  }
  out.textContent = 'warming up…'
  await new Promise(resolve => setTimeout(resolve, 0))
  time(upstream.run); time(lil2.run)
  const u = time(upstream.run), l = time(lil2.run)
  out.textContent = `${config.label}: upstream ${u.toFixed(3)} ms · lil2 ${l.toFixed(3)} ms per call · ${(u / l).toFixed(2)}× ${l <= u ? 'faster' : 'slower'}`
})
