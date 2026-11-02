# AGENTS.md

Guidance for coding agents working in this repository.

## What this is

A Claude Code mod (a function-hook plugin) that redraws the LaTeX math in
Claude's replies as Unicode, in the terminal only. It changes the drawing,
never the stored message or what the model sees.

## Layout

- `.claude-plugin/plugin.json`: the manifest (`name` must stay `latex-render`:
  it is the install name).
- `.claude-plugin/marketplace.json`: makes the repo installable with
  `/plugin install latex-render --marketplace AndreaCovelli/latex-render`.
- `.claude-plugin/icon.png`: the plugin icon, 1024×1024.
- `hooks/hooks.json`: names the hooks module, `./register.ts`.
- `hooks/register.ts`: one `ui.render` hook on `AssistantMessage`. It rewrites
  `e.props.text` on the `terminal` surface and passes everything else through
  with `next(e)`; its `.catch` falls back to `next(e)` so a converter bug can
  never blank a reply.
- `hooks/latex.ts`: the converter. Pure: no `$` engine calls, no I/O; its only
  import is `./symbols.ts`. `renderMath(markdown)` finds math outside code;
  `inlineMath(tex)` and `displayMath(tex)` convert one expression.
- `hooks/symbols.ts`: generated, do not edit by hand. `PORTED_SYMBOLS` (about
  2,000 names from markview.nvim and render-latex.nvim) and `OPERATOR_CHARS`
  (the glyphs unicode-math classes as relations or binary operators).
- `scripts/gen-symbols.mjs`: writes `hooks/symbols.ts`; its header has the
  usage. `VERBOSE=1` lists the entries it drops (emoji, wide glyphs, names that
  are not plain letters).
- `hooks/widths.ts`: generated, do not edit by hand. `WIDE` and `AMBIGUOUS`,
  East_Asian_Width ranges, written by `python3 -I scripts/gen-widths.py
  hooks/widths.ts` from the running Python's `unicodedata`.
- `LICENSE` (Apache-2.0) and `NOTICE`: keep the NOTICE credits when the ported
  data changes source.
- `hooks/*.test.ts(x)`: tests for `claude plugin test`.
- `.claude-plugin/types/`: written by the engine when it loads the mod;
  git-ignored. Never edit or commit it.

## How the converter works

1. `renderMath` skips fenced blocks and code spans, then matches `$$…$$`,
   `\[…\]`, `\(…\)` and `$…$`. A `$` span needs no space inside its edges and a
   closing `$` not followed by a digit, so prices (`$5 and $10`) stay text.
2. `Parser` builds a small AST (`Node`). Anything it does not know (a command,
   an environment, a delimiter) or cannot parse (unbalanced braces, `\left`
   without `\right`, a stray `\end`) throws `Unsupported`.
3. Inline math goes through `flat()` to one line. Display math goes through
   `box()`, a 2D layout of `Box { lines, base, w }` joined by `hcat`/`vstack`
   on baselines; several lines become a fenced code block.
4. On `Unsupported` the span is shown as its source: inline math escaped for
   markdown (so `\,` and `\\` keep their backslashes), display math as a code
   block.

Conventions to keep:

- Unknown input shows its source. Never add a silent fallback that guesses.
- `tight` (inside fractions and scripts) keeps the source's spacing around
  operators; at the top level, binary operators and relations are spaced.
- Text drawn into markdown goes through `escapeMd`; text in a code block does
  not.
- `width()` counts terminal columns: combining marks 0, `WIDE` 2, `AMBIGUOUS`
  2 when the `ambiguousWide` option is on, else 1. Box drawing must hold under
  both settings: draw rules with `rule(ch, cols)` (rounds up to whole glyphs),
  and build a box whose lines carry non-ASCII glyphs with `fit(lines, base)`,
  never with a hand-counted `w`. Use `width(s)`, never `s.length`.
- The option lives in a module variable set only for one `renderMath` /
  `displayMath` call (`withOptions`); `register.ts` reads it from the
  manifest's `userConfig`.
- `tidy()` collapses runs of spaces. Spacing that must survive it (`\quad`,
  `\hspace`, `\phantom`) is built from NBSP (U+00A0), which `unbreak()` turns
  back into spaces at output.
- Inline `\underbrace`/`\overbrace` throw `Unsupported`, so they show their
  source: one line has no room for the brace.
- The symbol lookup is the last branch of `parseCommand`, after every
  structural command, so a ported name (the table has `sqrt`, `not`,
  `underbrace`, `overbrace` as glyphs) can never shadow one.
- `flat`/`box` take a second `tight` argument: never pass them to `.map`
  directly (the index would become `tight`); use `i => flat(i, tight)`.

## Adding a command

- A plain symbol: add it to `OWN_SYMBOLS` in `latex.ts`, which overrides the
  ported table. A glyph not already in `OPERATOR_CHARS` that should be spaced
  as a relation or operator also goes in the extra string of `OPERATORS`.
  To pick up upstream changes instead, regenerate `hooks/symbols.ts` with
  `scripts/gen-symbols.mjs` and update the revisions in its header.
- An upright function name: `FUNCTIONS`; one with limits in display: also
  `LIMIT_OPS`.
- A font, accent or environment: `FONT_COMMANDS`, `ACCENTS`, `ENVIRONMENTS`.
- Anything structural: a branch in `parseCommand`, a `Node` variant, and a case
  in both `flat` and `box`.

Add a test in `hooks/latex.test.ts` for each new construct, inline and
display.

## Checks

Run all three before committing:

```
claude plugin validate .
claude plugin test .
npx -y -p typescript tsc -p .   # needs .claude-plugin/types, laid when the engine loads the mod
```

For a quick look at output, `node` runs `hooks/latex.ts` directly (type
stripping): import `inlineMath`/`displayMath` from it in a scratch `.mjs`
outside the repo. Avoid TypeScript syntax Node cannot strip (parameter
properties, enums, namespaces).

## Commits

Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:` …).

## Constraints of the mod runtime

The hooks module runs in its own environment: no DOM, no Node, no `require`,
no dynamic `import()`. Files are ES modules imported with `import`
declarations. The hook API is early access and may change between Claude Code
releases; the types in `.claude-plugin/types/claude-code/index.d.ts` are the
reference for the installed version.
