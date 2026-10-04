// Hast trees as rows of indexed arrays, one per node in preorder:
// [type, parentRow, tagName, value, properties ([name, value] pairs in order), meta, position, extraKeys].
const known = new Set(['type', 'children', 'position', 'tagName', 'properties', 'value', 'data'])

export function fromObjects(tree) {
  const rows = []
  const walk = (node, parent) => {
    const p = node.position
    const position = p ? [p.start.line, p.start.column, p.start.offset, p.end.line, p.end.column, p.end.offset] : null
    const properties = node.properties ? Object.entries(node.properties) : null
    const meta = node.data && node.data.meta !== undefined ? node.data.meta : null
    const extra = Object.keys(node).filter(key => !known.has(key)).concat(node.data ? Object.keys(node.data).filter(key => key !== 'meta') : []).sort()
    const row = rows.length
    rows.push([node.type, parent, node.tagName ?? null, node.value ?? null, properties, meta, position, extra])
    for (const child of node.children || []) walk(child, row)
  }
  walk(tree, -1)
  return rows
}

// lil2's hast kinds, named for the comparison (test code only).
const kindNames = ['root', 'element', 'text', 'raw', 'comment', 'doctype']

// `columns` from `markdownToHast`; `propNames` and `keywordNames` are the module's vocabulary exports.
export function fromColumns(columns, propNames, keywordNames) {
  const [root, kind, , firstChild, nextSibling, tag, value, start, end, flags, meta, propHead, propName, propKind, propString, propNumber, propNext, lineStarts, tagNames] = columns
  const lineOf = offset => { let low = 0, high = lineStarts.length - 1; while (low < high) { const mid = (low + high + 1) >> 1; if (lineStarts[mid] <= offset) low = mid; else high = mid - 1 } return low + 1 }
  const point = offset => { const line = lineOf(offset); return [line, offset - lineStarts[line - 1] + 1, offset] }
  const propValue = prop => [propString[prop], propNumber[prop], propNumber[prop] !== 0, propString[prop] === '' ? [] : propString[prop].split(' '), keywordNames[propNumber[prop]], Number(propString[prop])][propKind[prop]]
  const rows = []
  const walk = (id, parent) => {
    const type = kindNames[kind[id]]
    let properties = null
    if (type === 'element') {
      properties = []
      for (let prop = propHead[id]; prop >= 0; prop = propNext[prop]) properties.push([propNames[propName[prop]], propValue(prop)])
    }
    const position = flags[id] & 1 ? [...point(start[id]), ...point(end[id])] : null
    const row = rows.length
    rows.push([type, parent, type === 'element' ? tagNames[tag[id]] : null, type === 'text' || type === 'raw' || type === 'comment' ? value[id] : null, properties, flags[id] & 2 ? meta[id] : null, position, []])
    for (let child = firstChild[id]; child >= 0; child = nextSibling[child]) walk(child, row)
  }
  walk(root, -1)
  return rows
}
