// Builds hooks/symbols.ts from markview.nvim's TeX entries and render-latex.nvim's symbols,
// with operator classes from unicode-math. Fetch the three inputs first:
//   https://raw.githubusercontent.com/OXY2DEV/markview.nvim/<rev>/lua/markview/symbols.lua
//   https://raw.githubusercontent.com/AndreaCovelli/render-latex.nvim/<rev>/lua/render_latex/unicode.lua
//   https://raw.githubusercontent.com/latex3/unicode-math/main/unicode-math-table.tex
// then: MV_REV=<rev> RL_REV=<rev> node scripts/gen-symbols.mjs symbols.lua unicode.lua unicode-math-table.tex hooks/symbols.ts
// (VERBOSE=1 lists the entries left out.)
import fs from 'fs'
const [mvPath, rlPath, umPath, out] = process.argv.slice(2)

const unlua = s => s.replace(/\\(u\{([0-9a-fA-F]+)\}|(\d{1,3})|.)/g, (_, e, hex, dec) =>
  hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCharCode(+dec) : ({ n: '\n', t: '\t' })[e] ?? e)

function section(src, startRe) {
  const lines = src.split('\n')
  const i = lines.findIndex(l => startRe.test(l))
  const j = lines.findIndex((l, k) => k > i && /^}/.test(l))
  return lines.slice(i + 1, j)
}
function entries(lines) {
  const map = new Map()
  for (const l of lines) {
    const m = /^\s*(?:\["([^"]+)"\]|([A-Za-z_][A-Za-z0-9_]*))\s*=\s*"((?:\\.|[^"\\])*)"\s*,?\s*(--.*)?$/.exec(l)
    if (m) map.set(m[1] ?? m[2], unlua(m[3]))
  }
  return map
}
const mv = entries(section(fs.readFileSync(mvPath, 'utf8'), /^symbols\.entries = \{/))
const rl = entries(section(fs.readFileSync(rlPath, 'utf8'), /^local symbols = \{/))

const WIDE = [[0x1100, 0x115f], [0x231a, 0x231b], [0x2329, 0x232a], [0x2e80, 0x303e], [0x3041, 0x33ff],
  [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xa000, 0xa4cf], [0xac00, 0xd7a3], [0xf900, 0xfaff],
  [0xfe30, 0xfe4f], [0xff00, 0xff60], [0xffe0, 0xffe6], [0x1f000, 0x1faff], [0x20000, 0x3fffd]]
const isMark = cp => (cp >= 0x300 && cp <= 0x36f) || (cp >= 0x20d0 && cp <= 0x20ff)
function ok(v) {
  if (/^ *$/.test(v)) return true // spacing and no-op commands
  const cps = Array.from(v, c => c.codePointAt(0))
  if (cps.filter(cp => !isMark(cp)).length !== 1 || isMark(cps[0])) return false
  if (/\p{Emoji_Presentation}|\uFE0F/u.test(v)) return false
  if (/[\x00-\x1f\x7f-\x9f\u200b-\u200f]/.test(v)) return false
  return !WIDE.some(([a, b]) => cps[0] >= a && cps[0] <= b)
}

const merged = new Map()
const dropped = []
for (const [src, map] of [['markview', mv], ['render-latex', rl]]) {
  for (const [k, v] of map) {
    if (!/^[A-Za-z]+$/.test(k)) { dropped.push(`${src} ${k} (name)`); continue }
    if (!ok(v)) { dropped.push(`${src} ${k} = ${JSON.stringify(v)} (glyph)`); continue }
    merged.set(k, v) // render-latex, second, wins over markview
  }
}

const ops = new Set()
for (const m of fs.readFileSync(umPath, 'utf8').matchAll(/\\UnicodeMathSymbol\{"([0-9A-F]+)\}\{[^}]*\}\{\\math(rel|bin)\}/g)) {
  const ch = String.fromCodePoint(parseInt(m[1], 16))
  if (ch > '\x7f') ops.add(ch)
}
const used = new Set([...merged.values()].map(v => Array.from(v)[0]).filter(c => c && ops.has(c)))

const keys = [...merged.keys()].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'case' }) || (a < b ? -1 : 1))
const body = []
let lineBuf = ' '
for (const k of keys) {
  const item = ` ${k}: ${JSON.stringify(merged.get(k)).replace(/[\u0300-\u036f\u20d0-\u20ff]/g, c => '\\u' + c.codePointAt(0).toString(16).padStart(4, '0'))},`
  if (lineBuf.length + item.length > 100) { body.push(lineBuf); lineBuf = ' ' }
  lineBuf += item
}
body.push(lineBuf)
const opList = [...used].sort().join('')

fs.writeFileSync(out, `// Generated: TeX command names -> Unicode symbols. Do not edit by hand; latex.ts's own
// OWN_SYMBOLS table overrides these entries.
//
// Sources (both Apache-2.0, see NOTICE), converted to TypeScript and filtered:
// - markview.nvim, lua/markview/symbols.lua (symbols.entries), commit ${process.env.MV_REV}
//   Copyright the markview.nvim authors, https://github.com/OXY2DEV/markview.nvim
// - render-latex.nvim, lua/render_latex/unicode.lua (symbols), commit ${process.env.RL_REV}
//   Copyright Andrea Covelli, https://github.com/AndreaCovelli/render-latex.nvim
// Operator classes: the characters unicode-math (https://github.com/latex3/unicode-math)
// classes as \\mathrel or \\mathbin, which LaTeX spaces.
//
// Kept: names a backslash command can reach ([A-Za-z]+) whose value is one
// single-width character (plus combining marks), or spacing.

export const PORTED_SYMBOLS: Record<string, string> = {
${body.join('\n')}
}

// Relations and binary operators among the values above.
export const OPERATOR_CHARS = '${opList.replace(/[\\']/g, '\\$&')}'
`)
console.error(`markview ${mv.size}, render-latex ${rl.size}, kept ${merged.size}, operators ${used.size}, dropped ${dropped.length}`)
if (process.env.VERBOSE) console.error(dropped.join('\n'))
