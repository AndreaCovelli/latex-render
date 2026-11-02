import type { Register } from 'claude-code'
import { renderMath } from './latex.ts'

// Rewrites only the drawing: the stored message keeps its LaTeX (ctrl+o).
export const register: Register = (on, options) => {
  const ambiguousWide = options.ambiguousWide === true
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isSummary) return next(e)
    const text = renderMath(e.props.text, { ambiguousWide })
    return text === e.props.text ? next(e) : next({ ...e, props: { ...e.props, text } })
  }).catch(($, e, next) => next(e))
}
