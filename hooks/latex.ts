// LaTeX math -> Unicode, for a terminal. Pure: no engine, no I/O.
//
// renderMath(markdown) finds $...$, \(...\), $$...$$ and \[...\] outside code,
// and replaces each with Unicode text. Inline math becomes one line; display
// math that needs several lines (fractions, matrices, cases) becomes a fenced
// block, so the terminal keeps its alignment.

import { OPERATOR_CHARS, PORTED_SYMBOLS } from './symbols.ts'
import { AMBIGUOUS, WIDE } from './widths.ts'

// ---------------------------------------------------------------- tables

// Spacing the source asked for (\quad, \hspace, \phantom): tidy() collapses
// runs of spaces but not these, which become spaces on output.
const NBSP = '\u00a0'
const unbreak = (s: string) => s.replace(/\u00a0/g, ' ')

// Our own entries, which override the ported table in symbols.ts.
const OWN_SYMBOLS: Record<string, string> = {
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
  lVert: '‖', rVert: '‖', backslash: '\\', lbrace: '{', rbrace: '}',
  imath: 'ı', jmath: 'ȷ', S: '§', P: '¶', copyright: '©', dag: '†',
  Longleftrightarrow: '⟺', longleftrightarrow: '⟷', l: 'ł', L: 'Ł', aa: 'å', AA: 'Å',
  // spacing: \quad and \qquad in no-break spaces (NBSP), which tidy() keeps
  quad: NBSP.repeat(2), qquad: NBSP.repeat(4), enspace: ' ', thinspace: ' ', medspace: ' ',
  thickspace: ' ', negthinspace: '', space: ' ',
}

const SYMBOLS: Record<string, string> = { ...PORTED_SYMBOLS, ...OWN_SYMBOLS }

// Relations and binary operators, which get a space on each side.
const OPERATORS = new Set([...OPERATOR_CHARS, '\\', ...'≤≥≠≈≡∼≃≅∝≪≫⊂⊃⊆⊇∈∉→←↔⇒⇐⇔⟹⟸⟺↦±×÷·∪∩∧∨'])
const isOperator = (s: string) => OPERATORS.has(Array.from(s)[0] ?? '')

// \not before a relation.
const NEGATIONS: Record<string, string> = {
  '=': '≠', '<': '≮', '>': '≯', '∈': '∉', '∋': '∌', '⊂': '⊄', '⊃': '⊅', '⊆': '⊈',
  '⊇': '⊉', '≤': '≰', '≥': '≱', '∼': '≁', '≃': '≄', '≅': '≇', '≈': '≉', '≡': '≢',
  '∃': '∄', '∣': '∤', '∥': '∦', '⊢': '⊬', '⊨': '⊭', '≺': '⊀', '≻': '⊁', '→': '↛',
  '←': '↚', '⇒': '⇏', '⇔': '⇎',
}

// \stackrel{def}{=} and friends, which Unicode has as one character.
const STACKED_EQUALS: Record<string, string> = { def: '≝', '?': '≟', '△': '≜', '∧': '≙', '⋆': '≛', m: '≞' }

// Named functions LaTeX sets upright.
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'coth', 'log', 'ln', 'lg', 'exp', 'lim', 'liminf',
  'limsup', 'max', 'min', 'sup', 'inf', 'det', 'dim', 'ker', 'deg', 'gcd',
  'arg', 'hom', 'Pr', 'mod', 'bmod', 'argmax', 'argmin', 'tr', 'rank', 'sgn',
  'lcm',
])

// Large operators: spaced from an operand that follows them directly.
const BIG_OPS = new Set(['∑', '∏', '∐', '⋃', '⋂', '⨁', '⨂', '⨀', '⨄', '⋁', '⋀', '⨆',
  '∫', '∬', '∭', '⨌', '∮', '∯', '∰', '∱', '∲', '∳'])

// Operators whose limits go above and below in display math.
const LIMIT_OPS = new Set(['∑', '∏', '∐', '⋃', '⋂', '⨁', '⨂', '⨀', '⨄', '⋁', '⋀', '⨆',
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
  dddot: '⃛', overleftarrow: '⃖', cancel: '̸', bcancel: '⃥', xcancel: '̸⃥', sout: '̶',
}
// Marks drawn on every character rather than once over the whole body.
const PER_CHAR_MARKS = new Set(['̅', '̲', '̸', '⃥', '̸⃥', '̶'])

// Unicode math alphanumerics: [capital A, small a, digit 0] (0 = none), plus holes.
const FONTS: Record<string, { base: [number, number, number]; holes: Record<string, string> }> = {
  bb: { base: [0x1d538, 0x1d552, 0x1d7d8], holes: { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' } },
  cal: { base: [0x1d49c, 0x1d4b6, 0], holes: { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' } },
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
const PLAIN_COMMANDS = new Set(['mathrm', 'mathit', 'mathnormal', 'textit', 'textrm', 'emph', 'mathop', 'mathbin', 'mathrel', 'mathord', 'displaystyle', 'textstyle', 'mbox'])
const TEXT_COMMANDS = new Set(['text', 'textrm', 'textnormal', 'mbox', 'hbox', 'textit', 'textsf'])
const IGNORED = new Set([
  'left', 'right', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr',
  'biggl', 'biggr', 'Biggl', 'Biggr', 'middle', 'displaystyle', 'textstyle',
  'scriptstyle', 'scriptscriptstyle', 'limits', 'nolimits', 'nonumber', 'notag', 'label',
  'bigm', 'Bigm', 'biggm', 'Biggm', 'mathstrut', 'strut',
])

// \xrightarrow{f} and friends: the arrow's left end, fill and right end.
const XARROWS: Record<string, [string, string, string]> = {
  xrightarrow: ['', '─', '→'], xleftarrow: ['←', '─', ''], xleftrightarrow: ['←', '─', '→'],
  xRightarrow: ['', '═', '⇒'], xLeftarrow: ['⇐', '═', ''], xLeftrightarrow: ['⇐', '═', '⇒'],
  xmapsto: ['├', '─', '→'],
}

// A length, as a number of terminal columns: \quad (1em) is two.
const EM: Record<string, number> = { em: 1, ex: 0.43, mu: 1 / 18, pt: 0.1, bp: 0.1, px: 0.1, mm: 0.285, cm: 2.85, in: 7.23 }

// ---------------------------------------------------------------- parsing

type Node =
  // limits: \limits (true) or \nolimits (false) after an operator; unset, LIMIT_OPS decides.
  | { t: 'text'; s: string; op?: boolean; limits?: boolean }
  | { t: 'row'; items: Node[] }
  | { t: 'frac'; num: Node; den: Node }
  | { t: 'sqrt'; idx?: Node; body: Node }
  | { t: 'scripts'; base: Node; sub?: Node; sup?: Node }
  | { t: 'accent'; mark: string; body: Node }
  | { t: 'lr'; l: string; r: string; body: Node }
  | { t: 'env'; name: string; rows: Node[][] }
  | { t: 'brace'; under: boolean; body: Node }
  | { t: 'boxed'; body: Node }
  | { t: 'phantom'; body: Node; keepW: boolean; keepH: boolean }
  | { t: 'xarrow'; ends: [string, string, string]; above: Node; below?: Node }
  | { t: 'sideset'; pre: Corners; post: Corners; base: Node }
  | { t: 'sep'; kind: 'row' | 'col' }

// A closing delimiter command: the space before it is not math (⟨u, v⟩).
const CLOSER = /^\\(?:\}|(?:rangle|rVert|rvert|rceil|rfloor|rbrace|rbrack|rgroup|rmoustache)(?![A-Za-z]))/

// Drops the source spaces at the end of a row being read.
function dropSpaces(items: Node[]) {
  for (let last = items[items.length - 1]; last?.t === 'text' && !last.s.trim(); last = items[items.length - 1]) items.pop()
}

// The scripts \sideset puts at an operator's corners.
type Corners = { sub?: Node; sup?: Node }

// Thrown on anything the converter does not know: the span is then shown as
// its LaTeX source rather than a guess.
class Unsupported extends Error {}

const ENVIRONMENTS = new Set([
  'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix', 'smallmatrix',
  'cases', 'dcases', 'aligned', 'align', 'alignat', 'alignedat', 'gather',
  'gathered', 'split', 'equation', 'multline', 'eqnarray', 'array', 'subarray',
])

const text = (s: string, op?: boolean): Node => ({ t: 'text', s, op })
const row = (items: Node[]): Node => (items.length === 1 ? items[0]! : { t: 'row', items })

class Parser {
  i = 0
  src: string
  // The \tag label, drawn at the right of display math.
  tag: string | undefined
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

  // sin x, sin θ, but sin(x) and sin²: TeX's space between an operator and its operand.
  // A \limits or \nolimits after the name says where display math puts its scripts.
  functionName(s: string, limits?: boolean): Node {
    this.skipSpace()
    const m = /^\\(no)?limits(?![A-Za-z])/.exec(this.src.slice(this.i))
    if (m) {
      this.i += m[0].length
      limits = !m[1]
      this.skipSpace()
    }
    const rest = this.src.slice(this.i)
    const n: Node = { t: 'text', s: /^(?:[A-Za-z0-9]|\\(?!(?:left|right|[Bb]igg?[lrm]?)(?![A-Za-z]))[A-Za-z])/.test(rest) ? s + ' ' : s }
    if (limits !== undefined) n.limits = limits
    return n
  }

  // \sideset's {_a^b} or {'}: scripts on nothing, or a prime.
  readCorners(): Corners {
    const n = this.readArg()
    if (!flat(n, true).trim()) return {}
    if (n.t === 'text' && /^[′″‴]$/.test(n.s)) return { sup: n }
    if (n.t === 'scripts' && n.base.t === 'text' && !n.base.s) return { sub: n.sub, sup: n.sup }
    throw new Unsupported('\\sideset corner')
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
      if (CLOSER.test(this.src.slice(this.i, this.i + 12))) dropSpaces(items)
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
      if (this.src.startsWith('\\colon', this.i) && !/[A-Za-z]/.test(this.src[this.i + 6] ?? '')) {
        // f\colon X -> f: X, punctuation: no space before, one after.
        this.i += 6
        dropSpaces(items)
        items.push(text(': '))
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
    const spaceBefore = /\s/.test(this.src[this.i - 2] ?? '')
    const name = this.readName()
    // As in TeX, the spaces after a control word end it and are not math: \langle u -> ⟨u.
    const afterName = this.i
    if (/^[A-Za-z]/.test(name)) this.skipSpace()
    if (name === '\\') return { t: 'sep', kind: 'row' }
    if (name === ',' || name === ':' || name === '>' || name === ';' || name === ' ') return text(' ')
    if (name === '!') return text('')
    if (name === '|') return text('‖')
    if (name === '{') { this.skipSpace(); return text('{') }
    if ('{}$%&#_'.includes(name)) return text(name)
    if (name === 'not') {
      const next = this.readArg()
      const s = next.t === 'text' ? next.s : flat(next)
      const neg = NEGATIONS[s] ?? s + '̸'
      return text(neg, isOperator(neg))
    }
    if (FUNCTIONS.has(name)) return this.functionName(name === 'bmod' ? 'mod' : name)
    // \operatorname*: limits above and below, as \lim has.
    if (name === 'operatorname') return this.functionName(flat(this.readArg()), this.src[afterName - 1] === '*' || undefined)
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
    if (TEXT_COMMANDS.has(name)) return this.readText()
    if (PLAIN_COMMANDS.has(name)) return this.readArg()
    if (name === 'pmod') return row([text(' (mod '), this.readArg(), text(')')])
    if (name === 'sideset') {
      const pre = this.readCorners(), post = this.readCorners()
      return { t: 'sideset', pre, post, base: this.readArg() }
    }
    if (name === 'overset' || name === 'stackrel') {
      const over = this.readArg()
      const base = this.readArg()
      const stacked = flat(base, true).trim() === '=' ? STACKED_EQUALS[flat(over, true).trim()] : undefined
      return stacked ? text(stacked, true) : { t: 'scripts', base, sup: over }
    }
    if (name === 'color') {
      this.skipOptional()
      this.readRawGroup()
      return text('')
    }
    if (name === 'textcolor') {
      this.skipOptional()
      this.readRawGroup()
      return this.readArg()
    }
    if (name === 'colorbox' || name === 'fcolorbox') {
      this.skipOptional()
      this.readRawGroup()
      if (name === 'fcolorbox') this.readRawGroup()
      return this.readText()
    }
    if (name === 'boxed') return { t: 'boxed', body: this.readArg() }
    if (name === 'fbox') return { t: 'boxed', body: this.readText() }
    if (name === 'phantom' || name === 'hphantom' || name === 'vphantom') {
      return { t: 'phantom', body: this.readArg(), keepW: name !== 'vphantom', keepH: name !== 'hphantom' }
    }
    if (name === 'hspace' || name === 'mspace') return text(this.spaces(this.readRawGroup()))
    if (name === 'kern' || name === 'mkern' || name === 'hskip' || name === 'mskip') {
      const m = /^\s*(-?(?:\d+\.?\d*|\.\d+))\s*([a-z]{2})(?:\s+(?:plus|minus)\s+-?[\d.]+\s*[a-z]{2})*/.exec(this.src.slice(this.i))
      if (!m) throw new Unsupported(`\\${name} without a length`)
      this.i += m[0].length
      return text(this.spaces(m[1]! + m[2]!))
    }
    const ends = XARROWS[name]
    if (ends) {
      const below = this.readOptional()
      return { t: 'xarrow', ends, above: this.readArg(), below }
    }
    if (name === 'substack') return { t: 'env', name: 'substack', rows: splitRows(this.readArg()) }
    if (name === 'tag') {
      const starred = this.src[this.i - 1] === '*'
      const label = this.readText()
      this.tag = starred ? flat(label) : `(${flat(label)})`
      return text('')
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
      if (name === 'label') this.readRawGroup()
      return text('')
    }
    if (name === 'begin') {
      const env = this.readRawGroup().replace('*', '')
      if (!ENVIRONMENTS.has(env)) throw new Unsupported(`unknown environment ${env}`)
      if (env === 'array' || env === 'alignat' || env === 'alignedat' || env === 'subarray') this.readRawGroup() // column spec
      const body = this.parseRow()
      if (!this.src.startsWith('\\end', this.i)) throw new Unsupported(`unclosed ${env}`)
      this.i += 4
      if (this.readRawGroup().replace('*', '') !== env) throw new Unsupported(`mismatched \\end`)
      return { t: 'env', name: env, rows: splitRows(body) }
    }
    // Symbols last, so no ported name can shadow a command handled above.
    const sym = SYMBOLS[name]
    if (sym === undefined) throw new Unsupported(`unknown command \\${name}`)
    // A big operator is spaced from an operand that follows it, as sin is: ∫ f(x).
    if (BIG_OPS.has(sym)) return this.functionName(sym)
    // An operator keeps the source's space after it, when it has one before it too:
    // spacing in scripts copies the source, and `i\in S` is i∈S, not i∈ S.
    if (isOperator(sym)) {
      if (spaceBefore) this.i = afterName
      return text(sym, true)
    }
    return text(sym)
  }

  // A text-mode group, as \text reads it.
  readText(): Node {
    return text(this.readRawGroup().replace(/\\([{}$%&_# ])/g, '$1'))
  }

  skipOptional() {
    this.skipSpace()
    if (this.peek() !== '[') return
    const end = this.src.indexOf(']', this.i)
    if (end < 0) throw new Unsupported('unclosed [')
    this.i = end + 1
  }

  // A TeX length (`1em`, `-3mu`) as spaces; negative lengths give none.
  spaces(len: string): string {
    const m = /^\s*(-?(?:\d+\.?\d*|\.\d+))\s*([a-z]{2})\s*$/.exec(len)
    const per = m ? EM[m[2]!] : undefined
    if (!m || per === undefined) throw new Unsupported(`unknown length ${len}`)
    return NBSP.repeat(Math.max(0, Math.round(Number(m[1]) * per * 2)))
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
  if (rows.length > 1 && last.length === 1 && isEmpty(last[0]!)) rows.pop()
  return rows
}

const isEmpty = (n: Node): boolean => (n.t === 'text' && n.s.trim() === '') || (n.t === 'row' && n.items.every(isEmpty))

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
      const scripts = scriptText(n.sub, SUB, '_') + scriptText(n.sup, SUP, '^')
      // =\u1d48\u1d49\u1da0, not = \u1d48\u1d49\u1da0: the scripts stay on the operator.
      if (n.base.t === 'text' && n.base.op && !tight) return spaced(n.base.s + scripts)
      // (a/b)², not a/b², which reads as a over b²; (√x)², not √x².
      const base = flat(n.base, tight)
      return ((n.base.t === 'frac' || n.base.t === 'sqrt') && !isAtomic(base) ? `(${base})` : base) + scripts
    }
    // On one line a brace's label would read as a power or an index.
    case 'brace': throw new Unsupported('brace inline')
    case 'accent': {
      const body = flat(n.body, tight)
      const chars = Array.from(body)
      if (PER_CHAR_MARKS.has(n.mark)) return chars.map(c => (c === ' ' ? c : c + n.mark)).join('')
      return chars.length === 1 ? body + n.mark : `(${body})` + n.mark
    }
    case 'sideset': return corners(n.pre) + flat(n.base, tight) + corners(n.post)
    case 'boxed': return `[${flat(n.body, tight).trim()}]`
    case 'phantom': return n.keepW ? NBSP.repeat(width(flat(n.body, true))) : ''
    case 'xarrow': {
      const [l, fill, r] = n.ends
      const label = flat(n.above, true).trim()
      const arrow = l + fill + (label ? label + fill : '') + r + scriptText(n.below, SUB, '_')
      return tight ? arrow : spaced(arrow)
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
  if (n.name === 'substack' || n.name === 'subarray') return rows.map(r => r.join(' ')).join(', ')
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

function corners(c: Corners) { return scriptText(c.sub, SUB, '_') + scriptText(c.sup, SUP, '^') }

function isAtomic(s: string) { return Array.from(s).length <= 1 || /^[\p{L}\p{N}.]+$/u.test(s) }
function group(s: string) { return isAtomic(s) ? s : `(${s})` }

// ---------------------------------------------------------------- display

// A block of lines; `base` is the line that sits on the text's baseline.
// Every line is `w` columns wide: build one with `fit`, `line`, `hcat` or `vstack`.
type Box = { lines: string[]; base: number; w: number }

// Whether the terminal draws East Asian ambiguous-width characters (α, →, ─,
// …) two columns wide. Set only for the length of one renderMath call.
let ambiguousWide = false

function inRanges(cp: number, r: readonly number[]) {
  let lo = 0, hi = r.length / 2 - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (cp < r[mid * 2]!) hi = mid - 1
    else if (cp > r[mid * 2 + 1]!) lo = mid + 1
    else return true
  }
  return false
}

const ZERO_WIDTH = /[\p{Mn}\p{Me}\u200b-\u200f\u2060]/u

// Terminal columns: combining marks take none, wide characters two.
function width(s: string) {
  let n = 0
  for (const ch of s) {
    const cp = ch.codePointAt(0)!
    if (cp < 0xa1) { n++; continue }
    if (ZERO_WIDTH.test(ch)) continue
    n += inRanges(cp, WIDE) || (ambiguousWide && inRanges(cp, AMBIGUOUS)) ? 2 : 1
  }
  return n
}

// `ch` repeated to fill at least `cols` columns.
const rule = (ch: string, cols: number) => ch.repeat(Math.max(1, Math.ceil(cols / width(ch))))
const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - width(s)))
// A box whose width is that of its widest line. Every line is padded to it:
// vstack centres line by line, so a ragged box would lose its own alignment.
const fit = (lines: string[], base: number): Box => {
  const w = Math.max(0, ...lines.map(width))
  return { lines: lines.map(l => pad(l, w)), base, w }
}
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
  if (h === 1 || !t) return fit(Array.from({ length: h }, (_, i) => (i === base ? ch : t ? t[1] : ' ')), base)
  const lines = Array.from({ length: h }, (_, i) => (i === 0 ? t[0] : i === h - 1 ? t[2] : t[1]))
  if ((ch === '{' || ch === '}') && h >= 3) lines[Math.floor(h / 2)] = ch === '{' ? '⎨' : '⎬'
  if ((ch === '⟨' || ch === '⟩') && h !== 3) return fit(Array.from({ length: h }, (_, i) => (i === base ? ch : ' ')), base)
  return fit(lines, base)
}

// a + b        n
// ╰─┬─╯  or  ╭─┴─╮
//   n        a + b
function braced(body: Box, under: boolean, label?: Box): Box {
  // In glyphs: a terminal that draws ─ two columns wide gets half as many.
  const cw = width('─')
  const n = Math.max(Math.ceil(body.w / cw), 3), w = n * cw
  const inner: Box = { lines: body.lines.map(l => center(l, w)), base: body.base, w }
  const mid = Math.floor((n - 1) / 2)
  const [l, tick, r] = under ? ['╰', '┬', '╯'] : ['╭', '┴', '╮']
  const brace = line(l + '─'.repeat(mid - 1) + tick + '─'.repeat(n - mid - 2) + r)
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
      // An \xrightarrow brings its own spaces, so the text beside it drops its own.
      // An operator with limits is spaced from its operand, as in TeX: ∑ x, not ∑x.
      const out: Box[] = []
      let run: Node[] = []
      let afterArrow = false, afterOp = false
      const flush = (beforeArrow = false) => {
        let s = tidy(run.map(i => flat(i, tight)).join(''))
        if (afterArrow) s = s.trimStart()
        if (beforeArrow) s = s.trimEnd()
        if (afterOp && s && !/^[\s,;.:!?)\]}⟩|‖]/.test(s)) s = ' ' + s
        if (run.length && s) { out.push(line(s)); afterOp = false }
        run = []
      }
      for (const it of n.items) {
        const b = box(it, tight)
        if (b.lines.length === 1) { run.push(it); continue }
        const isArrow = it.t === 'xarrow' && !tight
        flush(isArrow)
        if (afterOp) out.push(line(' '))
        out.push(b)
        afterArrow = isArrow
        afterOp = limitsOp(it) !== undefined
      }
      flush()
      return hcat(out)
    }
    case 'frac': {
      const num = trimBox(box(n.num, true)), den = trimBox(box(n.den, true))
      // A rule as wide as a fraction inside it would leave which one is the main
      // fraction ambiguous: it then reaches one column past each side.
      const w = Math.max(num.w, den.w), nested = num.lines.length > 1 || den.lines.length > 1
      return vstack([num, line(rule('─', w < 3 || nested ? w + 2 : w)), den], num.lines.length)
    }
    case 'sqrt': {
      const body = box(n.body, tight)
      if (body.lines.length === 1) return line(flat(n, tight))
      const idx = n.idx ? flat(n.idx, true) : ''
      const h = body.lines.length
      // Every line starts with as many columns as the last one's `idx╲│`.
      const lead = ' '.repeat(width(idx) + width('╲'))
      const lines = [lead + '┌' + rule('─', body.w + 1)]
      body.lines.forEach((l, i) => lines.push((i === h - 1 ? idx + '╲' : lead) + '│ ' + l))
      return fit(lines, body.base + 1)
    }
    case 'scripts': {
      if (n.base.t === 'brace') {
        const label = n.base.under ? n.sub : n.sup
        return braced(box(n.base.body, tight), n.base.under, label && box(label, true))
      }
      // \sideset{_a}{'}\sum_{i}: the limits centre on the ∑, the corners beside it.
      const side = n.base.t === 'sideset' ? n.base : undefined
      const op = limitsOp(n)
      if (op) {
        const opBox = box(op, tight)
        const small = (m?: Node) => m && trimBox(box(m, true))
        const parts = [small(n.sup), opBox, small(n.sub)].filter((b): b is Box => !!b)
        const column = vstack(parts, (parts[0] !== opBox ? parts[0]!.lines.length : 0) + opBox.base)
        if (!side) return column
        const pre = corners(side.pre), post = corners(side.post)
        const off = Math.floor((column.w - opBox.w) / 2), x = Math.max(width(pre), off)
        const lines = column.lines.map((l, k) =>
          k === column.base ? ' '.repeat(x - width(pre)) + pre + opBox.lines[0] + post : ' '.repeat(x - off) + l)
        return fit(lines, column.base)
      }
      const base = box(n.base, tight)
      if (base.lines.length === 1) return line(flat(n, tight))
      // On a tall base, as in TeX: the superscript ends on its top line, the
      // subscript starts on its bottom line (⎛a⎞² … ⎝b⎠ᵢ, or the bar of f(x)|ₓ₌₀).
      // A script Unicode has small letters for is drawn with them: ⎞², not ⎞2.
      const small = (m: Node | undefined, table: Record<string, string>) => {
        if (!m) return undefined
        const b = box(m, true)
        const s = b.lines.length === 1 ? script(flat(m, true).trim().replace(/−/g, '-'), table) : undefined
        return s === undefined ? b : line(s)
      }
      const sub = small(n.sub, SUB), sup = small(n.sup, SUP)
      const w = Math.max(sup?.w ?? 0, sub?.w ?? 0)
      const above = sup ? sup.lines.length - 1 : 0, h = base.lines.length
      const below = sub ? sub.lines.length - 1 : 0
      const lines: string[] = []
      for (let r = 0; r < above + h + below; r++) {
        const right = sup?.lines[r] ?? sub?.lines[r - above - h + 1] ?? ''
        lines.push(pad(base.lines[r - above] ?? '', base.w) + pad(right, w))
      }
      return { lines, base: above + base.base, w: base.w + w }
    }
    case 'brace': return braced(box(n.body, tight), n.under)
    case 'sideset': return line(flat(n, tight))
    case 'boxed': {
      const body = trimBox(box(n.body, tight))
      // The inside is widened to a whole number of ─, so the sides line up.
      const cw = width('─')
      const inner = Math.ceil((body.w + 2) / cw) * cw
      const top = '─'.repeat(inner / cw)
      const lines = ['┌' + top + '┐', ...body.lines.map(l => '│ ' + pad(l, inner - 2) + ' │'), '└' + top + '┘']
      return fit(lines, body.base + 1)
    }
    case 'phantom': {
      const body = box(n.body, true)
      const w = n.keepW ? body.w : 0
      return n.keepH ? { lines: body.lines.map(() => ' '.repeat(w)), base: body.base, w } : line(' '.repeat(w))
    }
    case 'xarrow': {
      const [l, fill, r] = n.ends
      const above = box(n.above, true), below = n.below && box(n.below, true)
      const len = Math.max(above.w, below?.w ?? 0) + 2
      const arrow = line(l + rule(fill, len - width(l) - width(r)) + r)
      const parts = [above.w ? above : undefined, arrow, below].filter((b): b is Box => !!b)
      const b = vstack(parts, above.w ? above.lines.length : 0)
      return tight ? b : hcat([line(' '), b, line(' ')])
    }
    case 'accent': {
      const body = box(n.body, tight)
      if (body.lines.length === 1) return line(flat(n, tight))
      // A line over or under several lines is a rule; other marks have no tall form.
      const r = line(rule('─', body.w))
      if (n.mark === ACCENTS.overline || n.mark === ACCENTS.bar) return vstack([r, body], body.base + 1)
      if (n.mark === ACCENTS.underline) return vstack([body, r], body.base)
      throw new Unsupported('accent over several lines')
    }
    case 'lr': {
      const body = trimBox(box(n.body, tight))
      const h = body.lines.length
      // A tall delimiter stands a space off the body; \left. draws none, so no space.
      const gap = (d: string) => (h > 1 && d ? [line(' ')] : [])
      return hcat([delim(n.l, h, body.base), ...gap(n.l), body, ...gap(n.r), delim(n.r, h, body.base)])
    }
    case 'env': return envBox(n, tight)
  }
}

// The operator of `n` when display math puts its scripts above and below it.
function limitsOp(n: Node): Extract<Node, { t: 'text' }> | undefined {
  if (n.t !== 'scripts') return undefined
  const op = n.base.t === 'sideset' ? n.base.base : n.base
  return op.t === 'text' && (op.limits ?? LIMIT_OPS.has(op.s)) ? op : undefined
}

// Drops the blank columns a box has at both sides.
function trimBox(b: Box): Box {
  const used = b.lines.filter(l => l.trim())
  if (!used.length) return b
  const left = Math.min(...used.map(l => width(l) - width(l.trimStart())))
  return fit(b.lines.map(l => Array.from(l).slice(left).join('').trimEnd()), b.base)
}

function envBox(n: Extract<Node, { t: 'env' }>, tight: boolean): Box {
  // \substack: centred lines, as under a ∑.
  if (n.name === 'substack' || n.name === 'subarray') {
    return vstack(n.rows.map(r => trimBox(hcat(r.map(c => box(c, true))))), 0)
  }
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
    // Cells sit on one baseline: the row is as tall as the most above it plus the most below.
    const top = Math.max(...r.map(b => b.base))
    const h = top + 1 + Math.max(...r.map(b => b.lines.length - 1 - b.base))
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

function parse(tex: string): { node: Node; tag?: string } {
  const p = new Parser(tex)
  const node = p.parseRow()
  if (!p.done()) throw new Unsupported('unmatched \\end or \\right')
  return { node, tag: p.tag }
}

// Throws Unsupported on a command or environment it does not know.
export function inlineMath(tex: string): string {
  return unbreak(tidy(flat(parse(tex).node)).trim())
}

export type Options = {
  // The terminal draws East Asian ambiguous-width characters two columns wide.
  ambiguousWide?: boolean
}

function withOptions<T>(opts: Options, f: () => T): T {
  const saved = ambiguousWide
  ambiguousWide = opts.ambiguousWide ?? false
  try { return f() } finally { ambiguousWide = saved }
}

// Throws Unsupported on a command or environment it does not know.
export function displayMath(tex: string, opts: Options = {}): string[] {
  return withOptions(opts, () => drawDisplay(tex))
}

function drawDisplay(tex: string): string[] {
  const { node, tag } = parse(tex)
  const b = box(node)
  return (tag ? hcat([b, line('    ' + tag)]) : b).lines.map(l => unbreak(l).replace(/\s+$/, ''))
}

// Characters markdown would read as markup.
const escapeMd = (s: string) => s.replace(/[\\`*_[\]<>|~#]/g, '\\$&')

// Inline: $...$ with no space inside its edges, a closing $ not followed by a
// digit ("$5 and $10" is money, not math), or \(...\). An opening $ after a
// letter or digit counts only before a script on that word: error$_{k+1}$.
const MATH = /\$\$([\s\S]+?)\$\$([ \t]*)|\\\[([\s\S]+?)\\\]([ \t]*)|\\\(([\s\S]+?)\\\)|(?:(?<![\\$\w])\$(?![\s$])|(?<=[A-Za-z0-9])\$(?=[_^][^\s$]))((?:\\\$|[^$\n])+?)(?<![\s\\])\$(?![\d$\w])/g

// The start of a line that belongs to markdown, not to its text: indentation,
// quote marks and list markers.
const LINE_LEAD = /^[ \t]*(?:(?:>[ \t]?|(?:[-*+]|\d{1,9}[.)])[ \t]+)[ \t]*)*/

function renderSpan(text: string): string {
  return text.replace(MATH, (all, d1, t1, d2, t2, i1, i2, offset: number, src: string) => {
    const display = d1 ?? d2
    // The spaces after a display block: kept if it stays on its line, dropped
    // if it becomes a code block, where the text after it starts a new line.
    const trail: string = t1 ?? t2 ?? ''
    const lineStart = src.lastIndexOf('\n', offset - 1) + 1
    // What a line inside the block must start with to stay in the list item or
    // quote it began in: `> ` stays, a list marker (`- `, `1. `) becomes spaces.
    const lead = LINE_LEAD.exec(src.slice(lineStart, offset))![0]
    const indent = lead.replace(/(?:[-*+]|\d{1,9}[.)])(?=[ \t])/g, m => ' '.repeat(m.length))
    // In a quote, the lines of the math carry the quote's `>` too: they are not math.
    const quotes = (indent.match(/>/g) ?? []).length
    const unquote = (s: string) =>
      quotes ? s.replace(new RegExp(`\n[ \t]*(?:>[ \t]?){0,${quotes}}`, 'g'), '\n') : s
    const source = unquote(all.slice(0, all.length - trail.length))
    const alone = src.slice(lineStart + lead.length, offset).trim() === ''
    const rest = offset + all.length < src.length && src[offset + all.length] !== '\n'
    // The opening fence goes right after the lead when nothing else is before it.
    // The blank line after the block keeps a quote's `>`, so the quote goes on.
    const more = offset + all.length < src.length
    const fenced = (lines: string[]) =>
      (alone ? '' : '\n' + indent) + ['```', ...lines, '```'].map((l, k) => (k === 0 ? l : indent + l)).join('\n') + '\n' +
      (rest ? indent : quotes && more ? indent.trimEnd() : '')
    try {
      if (display === undefined) return escapeMd(inlineMath(i1 ?? i2))
      const lines = drawDisplay(unquote(display).trim())
      return lines.length === 1 ? escapeMd(lines[0]!.trim()) + trail : fenced(lines)
    } catch {
      // Something it does not know: the source as written, which markdown
      // would otherwise strip of its backslashes (\, and \\).
      return display === undefined ? escapeMd(all) : fenced(source.split('\n'))
    }
  })
}

// Leaves fenced code blocks and `code spans` alone.
export function renderMath(md: string, opts: Options = {}): string {
  if (!/\$|\\[(\[]/.test(md)) return md
  return withOptions(opts, () => renderMarkdown(md))
}

function renderMarkdown(md: string): string {
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
