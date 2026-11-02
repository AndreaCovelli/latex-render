import { expect, test } from 'claude-code/testing'
import { displayMath, inlineMath, renderMath } from './latex.ts'
import { PORTED_SYMBOLS } from './symbols.ts'

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
