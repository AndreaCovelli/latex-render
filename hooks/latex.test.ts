import { expect, test } from 'claude-code/testing'
import { displayMath, inlineMath, renderMath } from './latex.ts'

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

test('underbrace and overbrace draw a brace with the label', () => {
  expect(displayMath('\\underbrace{a+b}_{n}')).toEqual(['a + b', '╰─┬─╯', '  n'])
  expect(displayMath('\\overbrace{a+b}^{n}')).toEqual(['  n', '╭─┴─╮', 'a + b'])
  expect(inlineMath('\\underbrace{a+b}_{n}')).toBe('(a + b)ₙ')
})
