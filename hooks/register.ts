import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'
import { renderMath } from './latex.ts'

// Whether this session shows replies as their LaTeX source (`/latex-render source`).
// Reading it while drawing makes a switch redraw every reply.
const showingSource = atom({ plugin: 'latex-render', key: 'showingSource' } as const, false)

const COMMAND = 'latex-render'

// Rewrites only the drawing: the stored message keeps its LaTeX, which `v` in
// the ctrl+o transcript opens in an editor.
export const register: Register = (on, options) => {
  const ambiguousWide = options.ambiguousWide === true

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isSummary) return next(e)
    if (await read($, showingSource)) return next(e)
    const text = renderMath(e.props.text, { ambiguousWide })
    return text === e.props.text ? next(e) : next({ ...e, props: { ...e.props, text } })
  }).catch(($, e, next) => next(e))

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Show replies as LaTeX source, or drawn again: /latex-render source',
      argumentHint: '[source]',
      immediate: true,
    })
    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'source') {
      const source = await update($, showingSource, shown => !shown)
      return { text: source ? 'Showing replies as LaTeX source; /latex-render source draws them again.' : 'Drawing the math in replies again.' }
    }
    const source = await read($, showingSource)
    const state = source ? 'Showing replies as LaTeX source' : 'Drawing the math in replies'
    return { text: `${state}. /latex-render source switches.${arg ? ` (Unknown argument: ${arg}.)` : ''}` }
  })
}
