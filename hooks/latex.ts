// LaTeX math -> Unicode, for a terminal. Pure: no engine, no I/O.
//
// renderMath(markdown) finds $...$, \(...\), $$...$$ and \[...\] outside code,
// and replaces each with Unicode text. Inline math becomes one line; display
// math that needs several lines (fractions, matrices, cases) becomes a fenced
// block, so the terminal keeps its alignment.

// ---------------------------------------------------------------- tables

const SYMBOLS: Record<string, string> = {
  // Greek
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π', varpi: 'ϖ',
  rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ',
  phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  // binary operators
  pm: '±', mp: '∓', times: '×', div: '÷', cdot: '·', ast: '∗', star: '⋆',
  circ: '∘', bullet: '•', oplus: '⊕', ominus: '⊖', otimes: '⊗', odot: '⊙',
  cup: '∪', cap: '∩', setminus: '∖', wedge: '∧', land: '∧', vee: '∨', lor: '∨',
  sqcup: '⊔', sqcap: '⊓', uplus: '⊎', dagger: '†', ddagger: '‡', wr: '≀',
  // relations
  leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈',
  equiv: '≡', sim: '∼', simeq: '≃', cong: '≅', propto: '∝', ll: '≪', gg: '≫',
  leqslant: '⩽', geqslant: '⩾', prec: '≺', succ: '≻', preceq: '⪯', succeq: '⪰',
  subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇', subsetneq: '⊊',
  supsetneq: '⊋', in: '∈', notin: '∉', ni: '∋', perp: '⊥', parallel: '∥',
  mid: '∣', nmid: '∤', vdash: '⊢', dashv: '⊣', models: '⊨', asymp: '≍',
  doteq: '≐', triangleq: '≜', coloneqq: '≔', coloneq: '≔',
  // arrows
  to: '→', rightarrow: '→', leftarrow: '←', gets: '←', leftrightarrow: '↔',
  Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', implies: '⟹',
  impliedby: '⟸', iff: '⟺', mapsto: '↦', longrightarrow: '⟶',
  longleftarrow: '⟵', longmapsto: '⟼', Longrightarrow: '⟹', Longleftarrow: '⟸',
  uparrow: '↑', downarrow: '↓', updownarrow: '↕', Uparrow: '⇑', Downarrow: '⇓',
  hookrightarrow: '↪', hookleftarrow: '↩', nearrow: '↗', searrow: '↘',
  rightleftharpoons: '⇌', leadsto: '⇝',
  // big operators
  sum: '∑', prod: '∏', coprod: '∐', int: '∫', iint: '∬', iiint: '∭',
  oint: '∮', bigcup: '⋃', bigcap: '⋂', bigoplus: '⨁', bigotimes: '⨂',
  bigvee: '⋁', bigwedge: '⋀', bigsqcup: '⨆',
  // misc
  infty: '∞', partial: '∂', nabla: '∇', forall: '∀', exists: '∃',
  nexists: '∄', emptyset: '∅', varnothing: '∅', neg: '¬', lnot: '¬',
  top: '⊤', bot: '⊥', angle: '∠', triangle: '△', square: '□', Box: '□',
  ell: 'ℓ', hbar: 'ℏ', hslash: 'ℏ', Re: 'ℜ', Im: 'ℑ', aleph: 'ℵ', beth: 'ℶ',
  wp: '℘', prime: '′', degree: '°', checkmark: '✓', therefore: '∴',
  because: '∵', ldots: '…', dots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱',
  dotsc: '…', dotsb: '⋯', langle: '⟨', rangle: '⟩', lceil: '⌈', rceil: '⌉',
  lfloor: '⌊', rfloor: '⌋', vert: '|', Vert: '‖', lvert: '|', rvert: '|',
  lVert: '‖', rVert: '‖', backslash: '∖', lbrace: '{', rbrace: '}',
  imath: 'ı', jmath: 'ȷ', S: '§', P: '¶', copyright: '©', dag: '†',
  // spacing
  quad: '  ', qquad: '    ', enspace: ' ', thinspace: ' ', medspace: ' ',
  thickspace: ' ', negthinspace: '', space: ' ',
}

// Named functions LaTeX sets upright.
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'coth', 'log', 'ln', 'lg', 'exp', 'lim', 'liminf',
  'limsup', 'max', 'min', 'sup', 'inf', 'det', 'dim', 'ker', 'deg', 'gcd',
  'arg', 'hom', 'Pr', 'mod', 'bmod', 'argmax', 'argmin', 'tr', 'rank', 'sgn',
])

// Operators whose limits go above and below in display math.
const LIMIT_OPS = new Set(['∑', '∏', '∐', '⋃', '⋂', '⨁', '⨂', '⋁', '⋀', '⨆',
  'lim', 'max', 'min', 'sup', 'inf', 'liminf', 'limsup', 'argmax', 'argmin', 'det', 'gcd', 'Pr'])

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷',
  '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ',
  k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ',
  v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
  A: 'ᴬ', B: 'ᴮ', D: 'ᴰ', E: 'ᴱ', G: 'ᴳ', H: 'ᴴ', I: 'ᴵ', J: 'ᴶ', K: 'ᴷ', L: 'ᴸ',
  M: 'ᴹ', N: 'ᴺ', O: 'ᴼ', P: 'ᴾ', R: 'ᴿ', T: 'ᵀ', U: 'ᵁ', V: 'ⱽ', W: 'ᵂ',
  'α': 'ᵅ', 'β': 'ᵝ', 'γ': 'ᵞ', 'δ': 'ᵟ', 'ε': 'ᵋ', 'ϵ': 'ᵋ', 'θ': 'ᶿ', 'ι': 'ᶥ',
  'ϕ': 'ᵠ', 'φ': 'ᵠ', 'χ': 'ᵡ', ' ': ' ', ',': '˒', '′': '′', '*': '*', '∗': '*',
}
const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇',
  '8': '₈', '9': '₉', '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ',
  p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
  'β': 'ᵦ', 'γ': 'ᵧ', 'ρ': 'ᵨ', 'ϕ': 'ᵩ', 'φ': 'ᵩ', 'χ': 'ᵪ', ' ': ' ', ',': ',',
}

const VULGAR: Record<string, string> = {
  '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/5': '⅕',
  '2/5': '⅖', '3/5': '⅗', '4/5': '⅘', '1/6': '⅙', '5/6': '⅚', '1/8': '⅛',
  '3/8': '⅜', '5/8': '⅝', '7/8': '⅞', '1/7': '⅐', '1/9': '⅑', '1/10': '⅒',
}

const ACCENTS: Record<string, string> = {
  hat: '̂', widehat: '̂', bar: '̄', overline: '̅',
  vec: '⃗', overrightarrow: '⃗', dot: '̇', ddot: '̈',
  tilde: '̃', widetilde: '̃', check: '̌', breve: '̆',
  acute: '́', grave: '̀', underline: '̲', mathring: '̊',
}

// Unicode math alphanumerics: [capital A, small a, digit 0] (0 = none), plus holes.
const FONTS: Record<string, { base: [number, number, number]; holes: Record<string, string> }> = {
  bb: { base: [0x1d538, 0x1d552, 0x1d7d8], holes: { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' } },
  cal: { base: [0x1d4d0, 0x1d4ea, 0], holes: {} },
  frak: { base: [0x1d504, 0x1d51e, 0], holes: { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' } },
  bf: { base: [0x1d400, 0x1d41a, 0x1d7ce], holes: {} },
  sf: { base: [0x1d5a0, 0x1d5ba, 0x1d7e2], holes: {} },
  tt: { base: [0x1d670, 0x1d68a, 0x1d7f6], holes: {} },
}
const FONT_COMMANDS: Record<string, string> = {
  mathbb: 'bb', Bbb: 'bb', mathcal: 'cal', mathscr: 'cal', mathfrak: 'frak',
  mathbf: 'bf', bm: 'bf', boldsymbol: 'bf', textbf: 'bf', mathsf: 'sf',
  mathtt: 'tt', texttt: 'tt',
}
const PLAIN_COMMANDS = new Set(['mathrm', 'mathit', 'mathnormal', 'textit', 'textrm', 'emph', 'mathop', 'displaystyle', 'textstyle', 'mbox'])
const TEXT_COMMANDS = new Set(['text', 'textrm', 'textnormal', 'mbox', 'hbox', 'textit', 'textsf'])
const IGNORED = new Set([
  'left', 'right', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr',
  'biggl', 'biggr', 'Biggl', 'Biggr', 'middle', 'displaystyle', 'textstyle',
  'scriptstyle', 'limits', 'nolimits', 'nonumber', 'notag', 'label', 'tag',
])

// ---------------------------------------------------------------- parsing

type Node =
  | { t: 'text'; s: string; op?: boolean }
  | { t: 'row'; items: Node[] }
  | { t: 'frac'; num: Node; den: Node }
  | { t: 'sqrt'; idx?: Node; body: Node }
  | { t: 'scripts'; base: Node; sub?: Node; sup?: Node }
  | { t: 'accent'; mark: string; body: Node }
  | { t: 'lr'; l: string; r: string; body: Node }
  | { t: 'env'; name: string; rows: Node[][] }
  | { t: 'brace'; under: boolean; body: Node }
  | { t: 'sep'; kind: 'row' | 'col' }

// Thrown on anything the converter does not know: the span is then shown as
// its LaTeX source rather than a guess.
class Unsupported extends Error {}

const ENVIRONMENTS = new Set([
  'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix', 'smallmatrix',
  'cases', 'dcases', 'aligned', 'align', 'alignat', 'alignedat', 'gather',
  'gathered', 'split', 'equation', 'multline', 'eqnarray', 'array',
])

const text = (s: string, op?: boolean): Node => ({ t: 'text', s, op })
const row = (items: Node[]): Node => (items.length === 1 ? items[0]! : { t: 'row', items })

class Parser {
  i = 0
  src: string
  constructor(src: string) { this.src = src }

  peek(): string { return this.src[this.i] ?? '' }
  done() { return this.i >= this.src.length }

  skipSpace() { while (!this.done() && /\s/.test(this.peek())) this.i++ }

  readName(): string {
    const m = /^[A-Za-z]+\*?/.exec(this.src.slice(this.i))
    if (m) { this.i += m[0].length; return m[0].replace('*', '') }
    return this.src[this.i++] ?? ''
  }

  // A braced group's raw source, for \text and \begin{...}.
  readRawGroup(): string {
    this.skipSpace()
    if (this.peek() !== '{') return this.src[this.i++] ?? ''
    let depth = 0
    const start = ++this.i
    for (; !this.done(); this.i++) {
      const c = this.peek()
      if (c === '\\') { this.i++; continue }
      if (c === '{') depth++
      else if (c === '}') { if (depth-- === 0) break }
    }
    if (this.done()) throw new Unsupported('unclosed {')
    return this.src.slice(start, this.i++)
  }

  readOptional(): Node | undefined {
    this.skipSpace()
    if (this.peek() !== '[') return undefined
    this.i++
    return this.parseRow(']')
  }

  // One argument: a group, or one atom.
  readArg(): Node {
    this.skipSpace()
    if (this.peek() === '{') { this.i++; return this.parseRow('}') }
    return this.parseAtom() ?? text('')
  }

  // Reads until `stop` (consumed) or the end, or an \end (left for the caller).
  parseRow(stop?: string): Node {
    const items: Node[] = []
    let closed = !stop
    while (!this.done()) {
      if (stop && this.peek() === stop) { this.i++; closed = true; break }
      if (this.src.startsWith('\\end', this.i) && !/[A-Za-z]/.test(this.src[this.i + 4] ?? '')) break
      if (this.src.startsWith('\\right', this.i) && !/[A-Za-z]/.test(this.src[this.i + 6] ?? '')) break
      const c = this.peek()
      if (c === '^' || c === '_') {
        this.i++
        const arg = this.readArg()
        let last = items.pop()
        if (!last || last.t === 'sep') { if (last) items.push(last); last = text('') }
        const s: Node = last.t === 'scripts' && !(c === '^' ? last.sup : last.sub) ? last : { t: 'scripts', base: last }
        if (s.t === 'scripts') { if (c === '^') s.sup = arg; else s.sub = arg }
        items.push(s)
        continue
      }
      if (c === "'") {
        // x' -> x′, x'' -> x″
        let n = 0
        while (this.peek() === "'") { this.i++; n++ }
        items.push(text(n === 2 ? '″' : n === 3 ? '‴' : '′'.repeat(n)))
        continue
      }
      const atom = this.parseAtom()
      if (atom) items.push(atom)
    }
    if (!closed) throw new Unsupported(`unclosed ${stop}`)
    return row(items)
  }

  parseAtom(): Node | undefined {
    const c = this.src[this.i++]
    if (c === undefined) return undefined
    if (/\s/.test(c)) {
      while (!this.done() && /\s/.test(this.peek())) this.i++
      return text(' ')
    }
    if (c === '{') return this.parseRow('}')
    if (c === '}') throw new Unsupported('stray }')
    if (c === '&') return { t: 'sep', kind: 'col' }
    if (c === '~') return text(' ')
    if (c === '-') return text('−', true)
    if (c === '*') return text('∗')
    if (c === '<' || c === '>' || c === '=' || c === '+') return text(c, true)
    if (c !== '\\') return text(c)
    return this.parseCommand()
  }

  parseCommand(): Node | undefined {
    const name = this.readName()
    if (name === '\\') return { t: 'sep', kind: 'row' }
    if (name === ',' || name === ':' || name === '>' || name === ';' || name === ' ') return text(' ')
    if (name === '!') return text('')
    if (name === '|') return text('‖')
    if ('{}$%&#_'.includes(name)) return text(name)
    if (name === 'not') {
      const next = this.readArg()
      const s = next.t === 'text' ? next.s : flat(next)
      const negated: Record<string, string> = { '=': '≠', '∈': '∉', '⊂': '⊄', '⊆': '⊈', '≡': '≢', '∼': '≁', '<': '≮', '>': '≯', '≤': '≰', '≥': '≱', '∃': '∄' }
      return text(negated[s] ?? s + '̸')
    }
    const sym = SYMBOLS[name]
    if (sym !== undefined) return text(sym, /^[≤≥≠≈≡∼≃≅∝≪≫⊂⊃⊆⊇∈∉→←↔⇒⇐⇔⟹⟸⟺↦±×÷·∪∩∧∨]$/.test(sym))
    if (FUNCTIONS.has(name)) return text(name === 'bmod' ? 'mod' : name)
    if (name === 'operatorname') return text(flat(this.readArg()))
    if (name === 'frac' || name === 'dfrac' || name === 'tfrac' || name === 'cfrac') {
      const num = this.readArg()
      return { t: 'frac', num, den: this.readArg() }
    }
    if (name === 'binom' || name === 'dbinom' || name === 'tbinom') {
      const n = this.readArg()
      return { t: 'env', name: 'binom', rows: [[n], [this.readArg()]] }
    }
    if (name === 'sqrt') {
      const idx = this.readOptional()
      return { t: 'sqrt', idx, body: this.readArg() }
    }
    if (name === 'underbrace' || name === 'overbrace') {
      return { t: 'brace', under: name === 'underbrace', body: this.readArg() }
    }
    const mark = ACCENTS[name]
    if (mark !== undefined) return { t: 'accent', mark, body: this.readArg() }
    const font = FONT_COMMANDS[name]
    if (font !== undefined) return withFont(this.readArg(), font)
    if (TEXT_COMMANDS.has(name)) return text(this.readRawGroup().replace(/\\([{}$%&_# ])/g, '$1'))
    if (PLAIN_COMMANDS.has(name)) return this.readArg()
    if (name === 'pmod') return row([text(' (mod '), this.readArg(), text(')')])
    if (name === 'overset' || name === 'stackrel') {
      const over = this.readArg()
      return { t: 'scripts', base: this.readArg(), sup: over }
    }
    if (name === 'underset') {
      const under = this.readArg()
      return { t: 'scripts', base: this.readArg(), sub: under }
    }
    if (name === 'left') {
      const l = this.readDelim()
      const body = this.parseRow()
      if (!this.src.startsWith('\\right', this.i)) throw new Unsupported('\\left without \\right')
      this.i += 6
      return { t: 'lr', l, r: this.readDelim(), body }
    }
    if (IGNORED.has(name)) {
      if (name === 'label' || name === 'tag') this.readRawGroup()
      return text('')
    }
    if (name === 'begin') {
      const env = this.readRawGroup().replace('*', '')
      if (!ENVIRONMENTS.has(env)) throw new Unsupported(`unknown environment ${env}`)
      if (env === 'array' || env === 'alignat' || env === 'alignedat') this.readRawGroup() // column spec
      const body = this.parseRow()
      if (!this.src.startsWith('\\end', this.i)) throw new Unsupported(`unclosed ${env}`)
      this.i += 4
      if (this.readRawGroup().replace('*', '') !== env) throw new Unsupported(`mismatched \\end`)
      return { t: 'env', name: env, rows: splitRows(body) }
    }
    throw new Unsupported(`unknown command \\${name}`)
  }

  readDelim(): string {
    this.skipSpace()
    if (this.peek() === '\\') {
      this.i++
      const name = this.readName()
      if (name === '{' || name === '}') return name
      if (name === '|') return '‖'
      const sym = SYMBOLS[name]
      if (sym === undefined) throw new Unsupported(`unknown delimiter \\${name}`)
      return sym
    }
    const c = this.src[this.i++] ?? ''
    return c === '.' ? '' : c
  }
}

function splitRows(body: Node): Node[][] {
  const items = body.t === 'row' ? body.items : [body]
  const rows: Node[][] = [[]]
  const cur = () => rows[rows.length - 1]!
  let cell: Node[] = []
  for (const it of items) {
    if (it.t === 'sep') {
      cur().push(trimRow(cell))
      cell = []
      if (it.kind === 'row') rows.push([])
    } else cell.push(it)
  }
  cur().push(trimRow(cell))
  // A trailing \\ leaves an empty last row.
  const last = cur()
  if (rows.length > 1 && last.length === 1 && flat(last[0]!) === '') rows.pop()
  return rows
}

function trimRow(items: Node[]): Node {
  const blank = (n: Node | undefined) => n?.t === 'text' && n.s.trim() === ''
  while (blank(items[0])) items.shift()
  while (blank(items[items.length - 1])) items.pop()
  return row(items)
}

function mapFont(s: string, font: string): string {
  const f = FONTS[font]
  if (!f) return s
  return Array.from(s, ch => {
    const hole = f.holes[ch]
    if (hole) return hole
    const code = ch.codePointAt(0)!
    if (ch >= 'A' && ch <= 'Z') return String.fromCodePoint(f.base[0] + code - 65)
    if (ch >= 'a' && ch <= 'z') return String.fromCodePoint(f.base[1] + code - 97)
    if (ch >= '0' && ch <= '9' && f.base[2]) return String.fromCodePoint(f.base[2] + code - 48)
    return ch
  }).join('')
}

function withFont(n: Node, font: string): Node {
  switch (n.t) {
    case 'text': return { ...n, s: mapFont(n.s, font) }
    case 'row': return { t: 'row', items: n.items.map(i => withFont(i, font)) }
    case 'scripts': return { ...n, base: withFont(n.base, font) }
    case 'accent': return { ...n, body: withFont(n.body, font) }
    default: return n
  }
}

// ---------------------------------------------------------------- inline

// A node as one line of text. `tight`: inside a fraction or a script, where
// operators keep only the spaces the source gave them.
function flat(n: Node, tight = false): string {
  switch (n.t) {
    case 'text': return n.op && !tight ? spaced(n.s) : n.s
    case 'sep': return n.kind === 'row' ? '; ' : ' '
    case 'row': return tidy(n.items.map(i => flat(i, tight)).join(''))
    case 'frac': {
      const a = flat(n.num, true).trim(), b = flat(n.den, true).trim()
      const vulgar = VULGAR[`${a}/${b}`]
      if (vulgar) return vulgar
      if (/^\d+$/.test(a) && /^\d+$/.test(b)) return script(a, SUP)! + '⁄' + script(b, SUB)!
      return group(a) + '/' + group(b)
    }
    case 'sqrt': {
      const body = flat(n.body, tight).trim()
      const idx = n.idx ? flat(n.idx, true).trim() : ''
      const root = idx === '3' ? '∛' : idx === '4' ? '∜' : (idx ? script(idx, SUP) ?? `(${idx})` : '') + '√'
      return root + group(body)
    }
    case 'scripts': {
      const base = n.base.t === 'brace' ? group(flat(n.base.body, tight).trim()) : flat(n.base, tight)
      return base + scriptText(n.sub, SUB, '_') + scriptText(n.sup, SUP, '^')
    }
    case 'brace': return flat(n.body, tight)
    case 'accent': {
      const body = flat(n.body, tight)
      const chars = Array.from(body)
      if (n.mark === '\u0305' || n.mark === '\u0332') return chars.map(c => c + n.mark).join('')
      return chars.length === 1 ? body + n.mark : `(${body})` + n.mark
    }
    case 'lr': return n.l + flat(n.body, tight).trim() + n.r
    case 'env': return flatEnv(n, tight)
  }
}

function flatEnv(n: Extract<Node, { t: 'env' }>, tight: boolean): string {
  const rows = n.rows.map(cells => cells.map(c => flat(c, tight).trim()))
  const br = BRACKETS[n.name]
  if (n.name === 'binom') return `C(${rows[0]?.[0] ?? ''}, ${rows[1]?.[0] ?? ''})`
  if (n.name === 'cases' || n.name === 'dcases') return '{ ' + rows.map(r => r.join(' ')).join('; ') + ' }'
  if (br) return br[0] + rows.map(r => r.join(' ')).join('; ') + br[1]
  // align, gather, split, ...: rows joined
  return rows.map(r => r.join('')).join(';  ')
}

const BRACKETS: Record<string, [string, string]> = {
  matrix: ['', ''], smallmatrix: ['', ''], pmatrix: ['(', ')'], bmatrix: ['[', ']'],
  Bmatrix: ['{', '}'], binom: ['(', ')'], vmatrix: ['|', '|'], Vmatrix: ['‖', '‖'], array: ['', ''],
}

function spaced(op: string) { return ` ${op} ` }

// Collapse the spaces that operators and source spacing pile up.
function tidy(s: string) {
  return s.replace(/ {2,}/g, m => (m.length >= 4 ? m : ' ')).replace(/\( /g, '(').replace(/ \)/g, ')')
    .replace(/(^|[(\[{,^_]) ?− /g, '$1−') // unary minus
    .replace(/([=<>≤≥≠≈→∈]) − /g, '$1 −')
}

function script(s: string, table: Record<string, string>): string | undefined {
  let out = ''
  for (const ch of s) {
    const m = table[ch]
    if (m === undefined) return undefined
    out += m
  }
  return out
}

function scriptText(n: Node | undefined, table: Record<string, string>, mark: string): string {
  if (!n) return ''
  const s = flat(n, true).trim()
  if (s === '∘' && mark === '^') return '°'
  if (s === '′' || s === '″' || s === '†' || s === '∗') return s
  return script(s.replace(/−/g, '-'), table) ?? mark + (Array.from(s).length > 1 ? `(${s})` : s)
}

function isAtomic(s: string) { return Array.from(s).length <= 1 || /^[\p{L}\p{N}.]+$/u.test(s) }
function group(s: string) { return isAtomic(s) ? s : `(${s})` }

// ---------------------------------------------------------------- display

// A block of lines; `base` is the line that sits on the text's baseline.
type Box = { lines: string[]; base: number; w: number }

const width = (s: string) => Array.from(s.replace(/[\u0300-\u036f\u20d0-\u20ff]/g, '')).length
const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - width(s)))
const center = (s: string, w: number) => {
  const left = Math.floor((w - width(s)) / 2)
  return pad(' '.repeat(Math.max(0, left)) + s, w)
}
const line = (s: string): Box => ({ lines: [s], base: 0, w: width(s) })

function hcat(boxes: Box[]): Box {
  if (boxes.length === 0) return line('')
  const above = Math.max(...boxes.map(b => b.base))
  const below = Math.max(...boxes.map(b => b.lines.length - 1 - b.base))
  const lines: string[] = []
  for (let r = -above; r <= below; r++) {
    lines.push(boxes.map(b => pad(b.lines[b.base + r] ?? '', b.w)).join(''))
  }
  return { lines, base: above, w: boxes.reduce((a, b) => a + b.w, 0) }
}

function vstack(boxes: Box[], base: number, align: (s: string, w: number) => string = center): Box {
  const w = Math.max(...boxes.map(b => b.w))
  const lines = boxes.flatMap(b => b.lines.map(l => align(l, w)))
  return { lines, base, w }
}

const TALL: Record<string, [string, string, string, string]> = {
  '(': ['⎛', '⎜', '⎝', '('], ')': ['⎞', '⎟', '⎠', ')'],
  '[': ['⎡', '⎢', '⎣', '['], ']': ['⎤', '⎥', '⎦', ']'],
  '{': ['⎧', '⎪', '⎩', '{'], '}': ['⎫', '⎪', '⎭', '}'],
  '|': ['│', '│', '│', '|'], '‖': ['‖', '‖', '‖', '‖'],
  '⌈': ['⌈', '│', '│', '⌈'], '⌉': ['⌉', '│', '│', '⌉'],
  '⌊': ['│', '│', '⌊', '⌊'], '⌋': ['│', '│', '⌋', '⌋'],
  '⟨': ['╱', '⟨', '╲', '⟨'], '⟩': ['╲', '⟩', '╱', '⟩'],
}

function delim(ch: string, h: number, base: number): Box {
  if (!ch) return { lines: Array(h).fill(''), base, w: 0 }
  const t = TALL[ch]
  if (h === 1 || !t) return { lines: Array.from({ length: h }, (_, i) => (i === base ? ch : t ? t[1] : ' ')), base, w: width(ch) }
  const lines = Array.from({ length: h }, (_, i) => (i === 0 ? t[0] : i === h - 1 ? t[2] : t[1]))
  if ((ch === '{' || ch === '}') && h >= 3) lines[Math.floor(h / 2)] = ch === '{' ? '⎨' : '⎬'
  if ((ch === '⟨' || ch === '⟩') && h !== 3) return { lines: Array.from({ length: h }, (_, i) => (i === base ? ch : ' ')), base, w: 1 }
  return { lines, base, w: 1 }
}

// a + b        n
// ╰─┬─╯  or  ╭─┴─╮
//   n        a + b
function braced(body: Box, under: boolean, label?: Box): Box {
  const w = Math.max(body.w, 3)
  const inner: Box = { lines: body.lines.map(l => center(l, w)), base: body.base, w }
  const mid = Math.floor((w - 1) / 2)
  const [l, tick, r] = under ? ['╰', '┬', '╯'] : ['╭', '┴', '╮']
  const brace = line(l + '─'.repeat(mid - 1) + tick + '─'.repeat(w - mid - 2) + r)
  if (under) return vstack(label ? [inner, brace, label] : [inner, brace], inner.base)
  const parts = label ? [label, brace, inner] : [brace, inner]
  return vstack(parts, (label ? label.lines.length : 0) + 1 + inner.base)
}

function box(n: Node, tight = false): Box {
  switch (n.t) {
    case 'text':
    case 'sep': return line(flat(n, tight))
    case 'row': {
      // Runs of one-line items are joined as text first, so they read as inline.
      const out: Box[] = []
      let run: Node[] = []
      const flush = () => { if (run.length) out.push(line(tidy(run.map(i => flat(i, tight)).join('')))); run = [] }
      for (const it of n.items) {
        const b = box(it, tight)
        if (b.lines.length === 1) run.push(it)
        else { flush(); out.push(b) }
      }
      flush()
      return hcat(out)
    }
    case 'frac': {
      const num = trimBox(box(n.num, true)), den = trimBox(box(n.den, true))
      const w = Math.max(num.w, den.w)
      return vstack([num, line('─'.repeat(w < 3 ? w + 2 : w)), den], num.lines.length)
    }
    case 'sqrt': {
      const body = box(n.body, tight)
      if (body.lines.length === 1) return line(flat(n, tight))
      const idx = n.idx ? flat(n.idx, true) : ''
      const h = body.lines.length
      const lines = [' '.repeat(idx.length) + ' ┌' + '─'.repeat(body.w + 1)]
      body.lines.forEach((l, i) => lines.push((i === h - 1 ? idx + '╲│' : ' '.repeat(idx.length) + ' │') + ' ' + l))
      return { lines, base: body.base + 1, w: idx.length + 3 + body.w }
    }
    case 'scripts': {
      if (n.base.t === 'brace') {
        const label = n.base.under ? n.sub : n.sup
        return braced(box(n.base.body, tight), n.base.under, label && box(label, true))
      }
      const base = box(n.base, tight)
      const isLimitOp = n.base.t === 'text' && LIMIT_OPS.has(n.base.s)
      if (isLimitOp) {
        const small = (m?: Node) => m && trimBox(box(m, true))
        const parts = [small(n.sup), base, small(n.sub)].filter((b): b is Box => !!b)
        return vstack(parts, (parts[0] !== base ? parts[0]!.lines.length : 0) + base.base)
      }
      if (base.lines.length === 1) return line(flat(n, tight))
      const sub = n.sub && box(n.sub, true), sup = n.sup && box(n.sup, true)
      const right = [sup, sub].filter((b): b is Box => !!b)
      const lines: string[] = []
      const w = Math.max(...right.map(b => b.w))
      if (sup) sup.lines.forEach(l => lines.push(pad('', base.w) + pad(l, w)))
      base.lines.forEach(l => lines.push(pad(l, base.w) + ' '.repeat(w)))
      if (sub) sub.lines.forEach(l => lines.push(pad('', base.w) + pad(l, w)))
      return { lines, base: (sup ? sup.lines.length : 0) + base.base, w: base.w + w }
    }
    case 'brace': return braced(box(n.body, tight), n.under)
    case 'accent': {
      const body = box(n.body, tight)
      return body.lines.length === 1 ? line(flat(n, tight)) : body
    }
    case 'lr': {
      const body = trimBox(box(n.body, tight))
      const h = body.lines.length
      const gap = h > 1 ? [line(' ')] : []
      return hcat([delim(n.l, h, body.base), ...gap, body, ...gap, delim(n.r, h, body.base)])
    }
    case 'env': return envBox(n, tight)
  }
}

// Drops the blank columns a box has at both sides.
function trimBox(b: Box): Box {
  const used = b.lines.filter(l => l.trim())
  if (!used.length) return b
  const left = Math.min(...used.map(l => width(l) - width(l.trimStart())))
  const lines = b.lines.map(l => Array.from(l).slice(left).join('').trimEnd())
  return { lines, base: b.base, w: Math.max(...lines.map(width)) }
}

function envBox(n: Extract<Node, { t: 'env' }>, tight: boolean): Box {
  const isMatrix = n.name in BRACKETS
  const isCases = n.name === 'cases' || n.name === 'dcases'
  // An align cell keeps its edges: `&= b` starts with the space before `=`.
  const cells = n.rows.map(r => r.map(c => (isMatrix || isCases ? trimBox(box(c, tight)) : box(c, tight))))
  const cols = Math.max(...cells.map(r => r.length))
  const colW = Array.from({ length: cols }, (_, c) => Math.max(0, ...cells.map(r => r[c]?.w ?? 0)))
  // align: columns alternate right- and left-aligned, with no gap at the &.
  const gap = (c: number) => (c === 0 ? '' : isMatrix ? '  ' : isCases ? '   ' : c % 2 === 1 ? '' : '  ')
  const align = (s: string, c: number) =>
    isMatrix ? center(s, colW[c]!) : !isCases && c % 2 === 0 && cols > 1 ? ' '.repeat(colW[c]! - width(s)) + s : pad(s, colW[c]!)
  const lines: string[] = []
  for (const r of cells) {
    const h = Math.max(...r.map(b => b.lines.length))
    const top = Math.max(...r.map(b => b.base))
    for (let k = 0; k < h; k++) {
      lines.push(r.map((b, c) => gap(c) + align(b.lines[k - top + b.base] ?? '', c)).join(''))
    }
    if (n.name === 'smallmatrix' || r === cells[cells.length - 1]) continue
    if (isMatrix && h > 1) lines.push('')
  }
  const w = Math.max(...lines.map(width))
  const body: Box = { lines: lines.map(l => pad(l, w)), base: Math.floor((lines.length - 1) / 2), w }
  if (isCases) return hcat([delim('{', lines.length, body.base), line(' '), body])
  const br = BRACKETS[n.name]
  if (!br) return body
  const inner = br[0] ? hcat([line(' '), body, line(' ')]) : body
  return hcat([delim(br[0], lines.length, inner.base), inner, delim(br[1], lines.length, inner.base)])
}

// ---------------------------------------------------------------- entry points

function parse(tex: string): Node {
  const p = new Parser(tex)
  const n = p.parseRow()
  if (!p.done()) throw new Unsupported('unmatched \\end or \\right')
  return n
}

// Throws Unsupported on a command or environment it does not know.
export function inlineMath(tex: string): string {
  return tidy(flat(parse(tex))).trim()
}

// Throws Unsupported on a command or environment it does not know.
export function displayMath(tex: string): string[] {
  return box(parse(tex)).lines.map(l => l.replace(/\s+$/, ''))
}

// Characters markdown would read as markup.
const escapeMd = (s: string) => s.replace(/[\\`*_[\]<>|~#]/g, '\\$&')

// Inline: $...$ with no space inside its edges, a closing $ not followed by a
// digit ("$5 and $10" is money, not math), or \(...\).
const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<![\\$\w])\$(?![\s$])((?:\\\$|[^$\n])+?)(?<![\s\\])\$(?![\d$\w])/g

function renderSpan(text: string): string {
  return text.replace(MATH, (all, d1, d2, i1, i2, offset: number, src: string) => {
    const display = d1 ?? d2
    const lineStart = src.lastIndexOf('\n', offset - 1) + 1
    const indent = /^[ \t]*/.exec(src.slice(lineStart))![0]
    const alone = src.slice(lineStart, offset).trim() === ''
    const fenced = (lines: string[]) =>
      (alone ? '' : '\n' + indent) + ['```', ...lines, '```'].map((l, k) => (k === 0 && alone ? l : indent + l)).join('\n') + '\n'
    try {
      if (display === undefined) return escapeMd(inlineMath(i1 ?? i2))
      const lines = displayMath(display.trim())
      return lines.length === 1 ? escapeMd(lines[0]!.trim()) : fenced(lines)
    } catch {
      // Something it does not know: the source as written, which markdown
      // would otherwise strip of its backslashes (\, and \\).
      return display === undefined ? escapeMd(all) : fenced(all.split('\n'))
    }
  })
}

// Leaves fenced code blocks and `code spans` alone.
export function renderMath(md: string): string {
  if (!/\$|\\[(\[]/.test(md)) return md
  const out: string[] = []
  const lines = md.split('\n')
  let fence: string | null = null
  let prose: string[] = []
  const flush = () => { if (prose.length) out.push(renderProse(prose.join('\n'))); prose = [] }
  for (const l of lines) {
    const mark = /^\s*(`{3,}|~{3,})/.exec(l)?.[1]
    if (fence) {
      out.push(l)
      if (mark && mark[0] === fence[0] && mark.length >= fence.length && l.trim() === mark) fence = null
    } else if (mark) {
      flush()
      fence = mark
      out.push(l)
    } else prose.push(l)
  }
  flush()
  return out.join('\n')
}

function renderProse(s: string): string {
  let result = ''
  let last = 0
  for (const m of s.matchAll(/(`+)[\s\S]*?(?<!`)\1(?!`)/g)) {
    result += renderSpan(s.slice(last, m.index)) + m[0]
    last = m.index! + m[0].length
  }
  return result + renderSpan(s.slice(last))
}
