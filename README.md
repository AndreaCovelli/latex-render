# latex-render

A Claude Code mod that draws the LaTeX math in Claude's replies as Unicode in
the terminal. Only the drawing changes: the stored message, and what Claude
sees, keep the LaTeX source (ctrl+o shows it).

| Claude writes | The terminal shows |
| --- | --- |
| `$x^2 + y^2 = z^2$` | x² + y² = z² |
| `$\sum_{i=1}^{n} i$` | ∑ᵢ₌₁ⁿ i |
| `$f: \mathbb{N} \to \mathbb{Z}$` | f: ℕ → ℤ |
| `$\frac{1}{2}$`, `$\frac{a+b}{c}$` | ½, (a+b)/c |

Display math (`$$…$$`, `\[…\]`) that needs several lines is drawn in a code
block so its columns stay aligned:

```
    −b ± √(b² − 4ac)        n      n(n+1)       a + b
x = ────────────────        ∑  i = ──────       ╰─┬─╯
           2a              i=1       2            n
```

It handles fractions, roots, sub/superscripts, big operators with limits,
`\left…\right`, matrices (`pmatrix`, `bmatrix`, `vmatrix`, …), `cases`,
`aligned`, `\underbrace`/`\overbrace`, accents, `\mathbb`/`\mathcal`/`\mathbf`,
and the usual Greek letters, operators, relations and arrows.

What it leaves alone:

- Prices such as `$5 and $10`, `code spans` and fenced code blocks.
- Math with a command or environment it does not know, or that does not parse:
  that is shown as its LaTeX source, backslashes intact, rather than a guess.
- Every surface but the terminal (desktop, VS Code, mobile).

## Install

Inside Claude Code, for a session:

```
claude --plugin-dir /path/to/latex-render
```

Claude only writes LaTeX when it has a reason to. A line like this in your
`CLAUDE.md` makes it a habit:

```
Write math in LaTeX: $...$ inline and $$...$$ for display.
```

## Layout

- `hooks/register.ts`: the `ui.render` hook on `AssistantMessage` that rewrites
  the text before the terminal draws it.
- `hooks/latex.ts`: the converter, a pure function from markdown to markdown
  (no engine calls, no I/O).
- `hooks/*.test.ts(x)`: tests, run with `claude plugin test .`.

## Development

```
claude plugin validate .
claude plugin test .
tsc -p .        # after the engine has loaded the mod once and laid its types
```

The mod uses Claude Code's function-hook API, which is marked early access; a
Claude Code update may change it.
