import { expect, test } from 'claude-code/testing'
import { displayMath, inlineMath, renderMath } from './latex.ts'
import { PORTED_SYMBOLS } from './symbols.ts'
import { AMBIGUOUS, WIDE } from './widths.ts'

test('an unknown command shows the LaTeX as written, backslashes kept', () => {
  expect(renderMath('see $\\softplus(x)\\, y$ here')).toBe('see $\\\\softplus(x)\\\\, y$ here')
  expect(() => inlineMath('\\frac{a}{b')).toThrow()
  expect(() => inlineMath('\\left( x')).toThrow()
  expect(() => inlineMath('\\begin{tikzcd} a \\end{tikzcd}')).toThrow()
})

test('unknown display math becomes a code block of its source', () => {
  expect(renderMath('$$\n\\foo{x}\n$$')).toBe('```\n$$\n\\foo{x}\n$$\n```\n')
})

test('fractions and scripts keep the spacing of the source', () => {
  expect(inlineMath('\\frac{a+b}{c}')).toBe('(a+b)/c')
  expect(inlineMath('\\frac{a + b}{c}')).toBe('(a + b)/c')
  expect(inlineMath('a+b')).toBe('a + b')
  expect(displayMath('\\frac{n(n+1)}{2}')).toEqual(['n(n+1)', '──────', '  2'])
})

test('underbrace and overbrace draw a brace in display, and show their source inline', () => {
  expect(displayMath('\\underbrace{a+b}_{n}')).toEqual(['a + b', '╰─┬─╯', '  n'])
  expect(displayMath('\\overbrace{a+b}^{n}')).toEqual(['  n', '╭─┴─╮', 'a + b'])
  expect(() => inlineMath('\\underbrace{a+b}_{n}')).toThrow()
  expect(renderMath('so $\\overbrace{a+b}^{n}$')).toBe('so $\\\\overbrace{a+b}^{n}$')
})

test('the ported table supplies symbols, with operators spaced', () => {
  expect(inlineMath('a \\lesssim b')).toBe('a ≲ b')
  expect(inlineMath('x\\boxplus y')).toBe('x ⊞ y')
  expect(inlineMath('\\digamma \\mho')).toBe('ϝ℧')
  expect(inlineMath('A \\nRightarrow B')).toBe('A ⇏ B')
  expect(inlineMath('\\not\\in')).toBe('∉')
})

test('no ported name shadows a command the parser handles', () => {
  // The ported table has \\sqrt, \\not, \\underbrace and \\overbrace as plain glyphs.
  expect(PORTED_SYMBOLS.sqrt).toBe('√')
  expect(inlineMath('\\sqrt{x+1}')).toBe('√(x + 1)')
  expect(inlineMath('a \\not= b')).toBe('a ≠ b')
  expect(displayMath('\\underbrace{a}_{n}')).toEqual([' a', '╰┬╯', ' n'])
  expect(Object.keys(PORTED_SYMBOLS).length).toBeGreaterThan(2000)
})

test('fixes: script letters, backslash, stacked equals', () => {
  expect(inlineMath('\\mathcal{O}(n) \\mathcal{L} \\mathscr{B}')).toBe('𝒪(n) ℒ ℬ')
  expect(inlineMath('A \\backslash B')).toBe('A \\ B')
  expect(inlineMath('a \\stackrel{def}{=} b')).toBe('a ≝ b')
  expect(inlineMath('a \\overset{!}{=} b')).toBe('a =^! b')
})

test('boxed, color, cancel, phantom and lengths', () => {
  expect(inlineMath('\\boxed{x=1}')).toBe('[x = 1]')
  expect(displayMath('\\boxed{E = mc^2}')).toEqual(['┌─────────┐', '│ E = mc² │', '└─────────┘'])
  expect(inlineMath('\\color{red} x + \\textcolor[HTML]{00FF00}{y}')).toBe('x + y')
  expect(inlineMath('\\cancel{x}')).toBe('x̸')
  expect(inlineMath('a\\phantom{xy}b')).toBe('a  b')
  expect(inlineMath('a\\quad b')).toBe('a  b')
  expect(inlineMath('a\\hspace{2em}b')).toBe('a    b')
  expect(inlineMath('a\\kern-3mu b')).toBe('a b')
  expect(() => inlineMath('\\hspace{1furlong}')).toThrow()
})

test('extensible arrows, substack and tag', () => {
  expect(inlineMath('A \\xrightarrow{f} B')).toBe('A ─f─→ B')
  expect(displayMath('A \\xrightarrow{f} B')).toEqual(['   f', 'A ──→ B'])
  expect(displayMath('A \\xleftarrow[g]{h} B')).toEqual(['   h', 'A ←── B', '   g'])
  expect(inlineMath('\\substack{i<n \\\\ j<m}')).toBe('i < n, j < m')
  expect(displayMath('\\sum_{\\substack{i<n \\\\ j<m}} a')).toEqual([' ∑  a', 'i<n', 'j<m'])
  expect(displayMath('x = 1 \\tag{1}')).toEqual(['x = 1     (1)'])
})

test('\\colon is punctuation, \\lcm upright, \\sideset puts scripts at the corners', () => {
  expect(inlineMath('f \\colon X \\to Y')).toBe('f: X → Y')
  expect(inlineMath('f\\colon A\\to B')).toBe('f: A → B')
  expect(inlineMath('a \\coloneqq b')).toBe('a ≔ b')
  expect(inlineMath('\\lcm(a, b)')).toBe('lcm(a, b)')
  expect(inlineMath('\\sideset{_1^2}{_3^4}\\prod')).toBe('₁²∏₃⁴')
  expect(displayMath("\\sideset{}{'}\\sum_{n<k} a_n")).toEqual([' ∑′ aₙ', 'n<k'])
  expect(displayMath('\\sideset{_1^2}{_3^4}\\sum_{i=1}^{n} x')).toEqual(['  n', '₁²∑₃⁴ x', ' i=1'])
  expect(() => inlineMath('\\sideset{a}{}\\sum')).toThrow()
})

test('widths are terminal columns: wide glyphs take two, ambiguous ones two on request', () => {
  expect(displayMath('\\frac{\\text{日本}}{2}')).toEqual(['日本', '────', ' 2'])
  expect(displayMath('\\boxed{x}')).toEqual(['┌───┐', '│ x │', '└───┘'])
  // Where ─ and │ are two columns, the box keeps its sides aligned: 8 columns each.
  expect(displayMath('\\boxed{x}', { ambiguousWide: true })).toEqual(['┌──┐', '│ x  │', '└──┘'])
  expect(displayMath('\\underbrace{a+b}_{n}', { ambiguousWide: true })).toEqual(['a + b', '╰┬╯', '  n'])
  expect(renderMath('$$\\boxed{x}$$', { ambiguousWide: true })).toBe('```\n┌──┐\n│ x  │\n└──┘\n```\n')
})

test('the space after a command name is not math, as in TeX', () => {
  expect(inlineMath('\\langle u, v \\rangle')).toBe('⟨u, v⟩')
  expect(inlineMath('\\lVert x \\rVert')).toBe('‖x‖')
  expect(inlineMath('\\{ x \\mid x > 0 \\}')).toBe('{x ∣ x > 0}')
  expect(inlineMath('\\Delta x + \\alpha \\beta')).toBe('Δx + αβ')
  // Function names and big operators keep a space before an operand.
  expect(inlineMath('\\sin x + \\sin(x) + \\sin^2 x + \\sin \\theta')).toBe('sin x + sin(x) + sin² x + sin θ')
  expect(inlineMath('\\int f(x) \\, dx')).toBe('∫ f(x) dx')
  // Operators keep it too, so spacing in scripts follows the source.
  expect(inlineMath('\\lim_{x \\to 0} f')).toBe('lim_(x → 0) f')
  expect(inlineMath('\\lim_{x\\to0} f')).toBe('lim_(x→0) f')
})

test('text after a display block drawn mid-sentence starts its line with no space', () => {
  expect(renderMath('roots $$x = \\frac{a}{b}$$ and more')).toBe('roots \n```\n     a\nx = ───\n     b\n```\nand more')
  expect(renderMath('a $$\\foo{x}$$ b')).toBe('a \n```\n$$\\foo{x}$$\n```\nb')
  expect(renderMath('a $$x + y$$ b')).toBe('a x + y b')
  expect(renderMath('$$\\frac{a}{b}$$\nnext')).toBe('```\n a\n───\n b\n```\n\nnext')
})

test('a $ glued to a word opens math only for a script on that word', () => {
  expect(renderMath('becomes "error$_{k+1}\\le$ error$_k$", which')).toBe('becomes "errorₖ₊₁ ≤ errorₖ", which')
  expect(renderMath('x$^2$ and e$^{i\\pi}$')).toBe('x² and e^(iπ)')
  expect(renderMath('a$b and c$d')).toBe('a$b and c$d')
  expect(renderMath('perl foo$_ bar$ baz')).toBe('perl foo$_ bar$ baz')
})

// A piece of display math draws the same wherever it sits: in a fraction, a
// box, delimiters, a root, a brace or a matrix cell, and beside other cells.
// Each wrapper puts the piece where a box can be stretched, centred or padded.
test('a multi-line piece keeps its own layout inside any other construct', () => {
  const pieces = [
    "\\sum_{o' \\in N_k(o)} x", '\\sum_{i=1}^{n} x_i', "\\sideset{}{'}\\sum_{n<k} a_n", '\\prod_{j}^{m} y',
    '\\lim_{x \\to 0} f', '\\max_{x \\in X} f(x)', '\\sum_{\\substack{i<n \\\\ j<m}} a',
    '\\frac{a + b}{c}', '\\frac{\\frac{a}{b}}{c}', '\\sqrt{\\frac{a}{b}}', '\\boxed{\\frac{1}{2}}',
    '\\left(\\frac{a}{b}\\right)^2', '\\underbrace{a + b}_{n}', 'A \\xleftarrow[g]{h} B', '\\binom{n}{k}',
    '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}', '\\begin{cases} a & x > 0 \\\\ b & x \\le 0 \\end{cases}',
    '\\left\\langle \\begin{matrix} a \\\\ b \\end{matrix} \\right\\rangle', '\\cancel{\\frac{a}{b}}',
    '\\text{if $\\frac{a}{b} > 0$}', '\\begin{gathered} a = b \\\\ c + d = \\frac{e}{f} \\end{gathered}',
  ]
  const wide = 'w'.repeat(20)
  const wrappers = [
    (x: string) => `\\frac{${x}}{1}`, (x: string) => `\\frac{1}{${x}}`,
    (x: string) => `\\frac{${x}}{${wide}}`, (x: string) => `\\frac{${wide}}{${x}}`,
    (x: string) => `\\boxed{${x}}`, (x: string) => `\\left( ${x} \\right)`, (x: string) => `\\sqrt{${x}}`,
    (x: string) => `\\underbrace{${x}}_{n}`, (x: string) => `\\left[ ${x} \\right]_{i}^{2}`, (x: string) => `y = ${x} + z`,
    (x: string) => `\\begin{matrix} ${x} & q \\\\ ${wide} & q \\end{matrix}`,
    (x: string) => `\\begin{matrix} \\sum^{n} q & ${x} \\end{matrix}`,
    (x: string) => `\\begin{matrix} \\sum_{n} q & ${x} \\end{matrix}`,
  ]
  const broken: string[] = []
  for (const ambiguousWide of [false, true]) {
    // A line as terminal cells: a glyph two columns wide is followed by an empty cell,
    // and a combining mark joins the cell of the glyph it is on.
    const inRanges = (cp: number, r: readonly number[]) => r.some((lo, i) => i % 2 === 0 && cp >= lo && cp <= r[i + 1]!)
    const cells = (l: string) => (l.match(/\P{M}\p{M}*/gu) ?? []).flatMap(ch => {
      const cp = ch.codePointAt(0)!
      return cp >= 0xa1 && (inRanges(cp, WIDE) || (ambiguousWide && inRanges(cp, AMBIGUOUS))) ? [ch, ''] : [ch]
    })
    const blank = (n: number) => Array<string>(Math.max(0, n)).fill(' ')
    for (const piece of pieces) {
      const own = displayMath(piece, { ambiguousWide }).map(cells)
      const indent = Math.min(...own.filter(l => l.some(c => c !== ' ')).map(l => l.findIndex(c => c !== ' ')))
      const inner = own.map(l => l.slice(indent))
      const w = Math.max(...inner.map(l => l.length))
      const want = inner.map(l => [...l, ...blank(w - l.length)].join('|'))
      for (const wrap of wrappers) {
        const out = displayMath(wrap(piece), { ambiguousWide }).map(cells)
        const at = (r: number, c: number) => want.every((l, k) => {
          const got = out[r + k]!.slice(c, c + w)
          return [...got, ...blank(w - got.length)].join('|') === l
        })
        const width = Math.max(...out.map(l => l.length))
        let found = false
        for (let r = 0; !found && r + want.length <= out.length; r++) for (let c = 0; !found && c < width; c++) found = at(r, c)
        if (!found) broken.push(`${wrap(piece)}${ambiguousWide ? ' (ambiguousWide)' : ''}`)
      }
    }
  }
  expect(broken).toEqual([])
})

test('operators with limits: \\limits, \\nolimits, \\operatorname* and the space to the operand', () => {
  const cases: [string, string[]][] = [
    ['\\sum\\limits_{i=1}^{n} i', [' n', ' ∑  i', 'i=1']],
    ['\\int\\limits_0^1 f', ['1', '∫ f', '0']],
    ['\\sum\\nolimits_{i} x', ['∑ᵢ x']],
    ['\\operatorname*{argmax}_{x} f', ['argmax f', '  x']],
    ['\\sum_{i}x', ['∑ x', 'i']],
    ['\\sum_{i}, x', ['∑, x', 'i']],
    ['\\lim_{n}\\frac{1}{n}', ['     1', 'lim ───', ' n   n']],
  ]
  for (const [tex, want] of cases) expect(displayMath(tex)).toEqual(want)
})

test('tall bases, nested fractions and accents over several lines', () => {
  const cases: [string, string[]][] = [
    // Scripts sit beside the top and bottom lines, small when Unicode has the letters.
    ['\\left(\\frac{a}{b}\\right)_i^2', ['⎛  a  ⎞²', '⎜ ─── ⎟', '⎝  b  ⎠ᵢ']],
    ['\\left. \\frac{df}{dx} \\right|_{x=0}', [' df  │', '──── │', ' dx  │ₓ₌₀']],
    ['\\left(\\frac{a}{b}\\right)^{\\frac{1}{2}}', ['        1', '       ───', '⎛  a  ⎞ 2', '⎜ ─── ⎟', '⎝  b  ⎠']],
    // The main rule is longer than the one in a fraction inside it.
    ['\\frac{\\frac{a}{b}}{c}', ['  a', ' ───', '  b', '─────', '  c']],
    ['\\overline{\\frac{a}{b}}', ['───', ' a', '───', ' b']],
    ['\\underline{\\frac{a}{b}}', [' a', '───', ' b', '───']],
  ]
  for (const [tex, want] of cases) expect(displayMath(tex)).toEqual(want)
  expect(() => displayMath('\\hat{\\frac{a}{b}}')).toThrow()
})

test('inline: a script on a fraction or root takes parentheses; operators space as the source', () => {
  const cases: [string, string][] = [
    ['\\frac{a}{b}^2', '(a/b)²'], ['\\frac{a+b}{c}^2', '((a+b)/c)²'], ['\\frac{1}{2}^n', '½ⁿ'],
    ['\\sqrt{x}^2', '(√x)²'], ['\\sqrt{2}', '√2'],
    ['\\sum_{i\\in S} x', '∑_(i∈S) x'], ['\\sum_{i \\in S} x', '∑_(i ∈ S) x'],
  ]
  for (const [tex, want] of cases) expect(inlineMath(tex)).toBe(want)
})

test('display math in a list item or a quote stays in it', () => {
  expect(renderMath('1. $$x = \\frac{1}{2}$$')).toBe('1. ```\n        1\n   x = ───\n        2\n   ```\n')
  expect(renderMath('  - $$\\frac{a}{b}$$ tail')).toBe('  - ```\n     a\n    ───\n     b\n    ```\n    tail')
  expect(renderMath('> $$\n> \\frac{a}{b}\n> $$\n> after')).toBe('> ```\n>  a\n> ───\n>  b\n> ```\n>\n> after')
  expect(renderMath('> quote $$\\frac{a}{b}$$')).toBe('> quote \n> ```\n>  a\n> ───\n>  b\n> ```\n')
})

test('display: \\\\ breaks lines, gather centres, ⟨⟩ at any height, $ inside \\text, \\tfrac, \\cancel', () => {
  const cases: [string, string[]][] = [
    ['a \\\\ b + c', ['  a', 'b + c']],
    ['a &= b \\\\ c + d &= e', ['    a = b', 'c + d = e']],
    ['\\begin{gather} a \\\\ b + c \\end{gather}', ['  a', 'b + c']],
    ['\\left\\langle \\begin{matrix} a \\\\ b \\end{matrix} \\right\\rangle', ['╱ a ╲', '╲ b ╱']],
    ['\\left\\langle \\frac{a}{b} \\right\\rangle', ['╱  a  ╲', '⟨ ─── ⟩', '╲  b  ╱']],
    ['\\text{if $\\frac{a}{b}$}', ['    a', 'if ───', '    b']],
    ['x = \\tfrac{a}{b}', ['x = a/b']],
    ['\\cancel{\\frac{a}{b}}', [' a̸', '─̸─̸─̸', ' b̸']],
  ]
  for (const [tex, want] of cases) expect(displayMath(tex)).toEqual(want)
})

test('inline: transposes, gradients, partials, a script before a word, $ before an ordinal suffix', () => {
  const cases: [string, string][] = [
    ['A^\\top', 'Aᵀ'], ['\\nabla_\\theta J(\\theta)', '∇_θ J(θ)'], ['\\frac{\\partial L}{\\partial w}', '∂L/∂w'],
    ['x_{\\alpha -1}', 'x_(α−1)'], ['\\text{if $x_1 > 0$}', 'if x₁ > 0'], ['\\text{costs \\$5}', 'costs $5'],
  ]
  for (const [tex, want] of cases) expect(inlineMath(tex)).toBe(want)
  expect(renderMath('the $k$th entry')).toBe('the kth entry')
  expect(renderMath('a$b and c$d')).toBe('a$b and c$d')
})
