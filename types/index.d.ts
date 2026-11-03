// latex-render's contract: the session state it keeps in `$.state`, which
// outlives a reload of its code.

/** Whether `/latex-render source` shows replies as their LaTeX source. */
export type LatexRenderShowingSource = boolean

declare module 'claude-code' {
  interface PluginState {
    'latex-render': { showingSource: LatexRenderShowingSource }
  }
}
