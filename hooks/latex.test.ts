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
  expect(inlineMath('\\digamma \\mho')).toBe('ϝ ℧')
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
  expect(inlineMath('a\\quad b')).toBe('a   b')
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
