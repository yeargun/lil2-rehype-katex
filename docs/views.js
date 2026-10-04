// Markup shared by the page script and the generator (which prerenders the first view).
const number = new Intl.NumberFormat('en-US')
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]))
const ratio = (lil, up) => lil / up
const times = r => `${r.toFixed(2)}×`
const state = r => r <= 0.97 ? 'win' : r >= 1.03 ? 'loss' : 'even'

// Speed in real browsers: median ms per call after an identical-output check, upstream vs lil2.
export function speedHtml(module) {
  const speed = module.speed
  if (!speed || !Object.keys(speed).length) return '<p class="objective-note">Not measured yet.</p>'
  return Object.entries(speed).map(([browser, s]) => `<div class="table-wrap objective-table"><table><caption>${escape(browser)} ${escape(s.version ?? '')} · median per call, identical output checked first</caption><thead><tr><th>Document</th><th>Upstream</th><th>lil2</th><th>Time</th></tr></thead><tbody>${
    Object.entries(s.docs).map(([doc, d]) => `<tr><th scope="row">${escape(doc)}</th><td>${d.upstreamMs.toFixed(3)} ms</td><td>${d.lil2Ms.toFixed(3)} ms</td><td class="verdict ${state(ratio(d.lil2Ms, d.upstreamMs))}"><strong>${times(ratio(d.lil2Ms, d.upstreamMs))}</strong></td></tr>`).join('')
  }${s.cold ? `<tr><th scope="row">load (import)</th><td>${s.cold.upstream.importMs.toFixed(1)} ms</td><td>${s.cold.lil2.importMs.toFixed(1)} ms</td><td class="verdict ${state(ratio(s.cold.lil2.importMs, s.cold.upstream.importMs))}"><strong>${times(ratio(s.cold.lil2.importMs, s.cold.upstream.importMs))}</strong></td></tr><tr><th scope="row">first call, cold</th><td>${s.cold.upstream.firstRunMs.toFixed(1)} ms</td><td>${s.cold.lil2.firstRunMs.toFixed(1)} ms</td><td class="verdict ${state(ratio(s.cold.lil2.firstRunMs, s.cold.upstream.firstRunMs))}"><strong>${times(ratio(s.cold.lil2.firstRunMs, s.cold.upstream.firstRunMs))}</strong></td></tr>` : ''}</tbody></table></div>`).join('') +
  `<p class="objective-note">Playwright, one fresh browser context per lane; lanes interleave and alternate order every round. Upstream is the same API bundled from npm for the browser; lil2 is the shipped browser build. Load is the module import after the file is fetched; first call is the first document, cold.</p>`
}

// The package card under the tabs: what it is, its API, its behaviour checks, its files.
export function cardHtml(module) {
  const link = module.page ? `<a href="${escape(module.page)}">page ↗</a>` : ''
  return `<div class="stack-card" style="margin-top:56px">
    <div>
      <h3>${escape(module.name)}</h3>
      <p>${escape(module.description)}</p>
      <div class="stack-meta"><a href="https://github.com/yeargun/${escape(module.name)}">GitHub ↗</a>${link}<a href="${escape(module.linksBase)}comparison.json">comparison.json ↗</a></div>
    </div>
    <div class="stack-detail-grid">
      <span>Rewrites</span><code>${escape(module.upstream.package)}@${escape(module.upstream.version)}</code>
      <span>API</span><code>${escape(module.api)}</code>
      <span>Behaviour</span><strong class="good">${escape(module.tests)}</strong>
      <span>Cells</span><strong>${module.wins} of ${module.cells} smaller</strong>
    </div>
  </div>`
}
