// Trees as rows of indexed arrays, one per node in preorder: [type, parentRow, fields, position, extraKeys].
// `fromColumns` reads lil2's columnar result; `fromObjects` flattens upstream's object tree the same way
// (test code only: lil2 itself never builds objects).
const fieldsByType = {
  heading: ['depth'], text: ['value'], html: ['value'], inlineCode: ['value'], math: ['meta', 'value'], inlineMath: ['value'],
  code: ['lang', 'meta', 'value'], list: ['ordered', 'start', 'spread'], listItem: ['spread', 'checked'],
  definition: ['identifier', 'label', 'title', 'url'], link: ['title', 'url'], image: ['title', 'url', 'alt'],
  linkReference: ['identifier', 'label', 'referenceType'], imageReference: ['identifier', 'label', 'referenceType', 'alt'],
  table: ['align'], footnoteDefinition: ['identifier', 'label'], footnoteReference: ['identifier', 'label']
}
const structural = new Set(['type', 'children', 'position', 'data'])

export function fromObjects(tree) {
  const rows = []
  const walk = (node, parent) => {
    const fields = (fieldsByType[node.type] || []).map(key => node[key] === undefined ? '<undefined>' : node[key])
    const known = new Set([...structural, ...(fieldsByType[node.type] || [])])
    const extra = Object.keys(node).filter(key => !known.has(key)).sort()
    const p = node.position
    const position = p ? [p.start.line, p.start.column, p.start.offset, p.end.line, p.end.column, p.end.offset] : null
    const row = rows.length
    rows.push([node.type, parent, fields, position, extra])
    for (const child of node.children || []) walk(child, row)
  }
  walk(tree, -1)
  return rows
}

// lil2's int vocabulary, named for the comparison (test code only).
export const kindNames = ['root', 'fragment', 'paragraph', 'heading', 'thematicBreak', 'blockquote', 'list', 'listItem', 'html', 'code', 'definition', 'text', 'emphasis', 'strong', 'inlineCode', 'break', 'link', 'image', 'linkReference', 'imageReference', 'delete', 'table', 'tableRow', 'tableCell', 'footnoteDefinition', 'footnoteReference', 'math', 'inlineMath']
const N = {S2: 1, S3: 2, LABEL: 4, ORDERED: 8, SPREAD: 16, START: 32, CHECKED_SET: 64, CHECKED: 128, POSITION: 512, END: 1024, IDENTIFIER: 2048, URL: 4096}
const referenceTypes = ['shortcut', 'collapsed', 'full']
const aligns = [null, 'left', 'center', 'right']

export function fromColumns(columns) {
  const [kind, flags, , firstChild, nextSibling, start, end, num, s1, s2, s3, identifier, label, lineStarts, identifiers, aux] = columns
  const lineOf = offset => { let low = 0, high = lineStarts.length - 1; while (low < high) { const mid = (low + high + 1) >> 1; if (lineStarts[mid] <= offset) low = mid; else high = mid - 1 } return low + 1 }
  const point = offset => { const line = lineOf(offset); return [line, offset - lineStarts[line - 1] + 1, offset] }
  const has = (id, flag) => (flags[id] & flag) !== 0
  const nullable = (id, flag, value) => has(id, flag) ? value : null
  const field = (id, type, key) => {
    switch (key) {
      case 'value': return s1[id]
      case 'depth': return num[id]
      case 'lang': return nullable(id, N.S2, s2[id])
      case 'meta': return nullable(id, N.S3, s3[id])
      case 'ordered': return has(id, N.ORDERED)
      case 'start': return nullable(id, N.START, num[id])
      case 'spread': return has(id, N.SPREAD)
      case 'checked': return has(id, N.CHECKED_SET) ? has(id, N.CHECKED) : null
      case 'identifier': return identifier[id] < 0 ? '' : identifiers[identifier[id]]
      case 'label': return label[id]
      case 'title': return nullable(id, N.S2, s2[id])
      case 'url': return s1[id]
      case 'alt': return nullable(id, N.S3, s3[id])
      case 'referenceType': return referenceTypes[num[id]]
      case 'align': return aux.slice(num[id] + 1, num[id] + 1 + aux[num[id]]).map(a => aligns[a])
    }
  }
  const rows = []
  const walk = (id, parent) => {
    const type = kindNames[kind[id]]
    const fields = (fieldsByType[type] || []).map(key => field(id, type, key))
    const position = has(id, N.POSITION) ? [...point(start[id]), ...point(end[id])] : null
    const row = rows.length
    rows.push([type, parent, fields, position, []])
    for (let child = firstChild[id]; child >= 0; child = nextSibling[child]) walk(child, row)
  }
  walk(0, -1)
  return rows
}
