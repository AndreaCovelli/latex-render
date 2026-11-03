import { expect, test } from 'claude-code/testing'

const MSG = (surface: 'terminal' | 'desktop', text: string) =>
  ({ plugin: 'latex-render', surface, component: 'AssistantMessage', requestId: 'm1', props: { text, isFirstOfReply: true } }) as const

test('LaTeX in a reply is drawn as Unicode on the terminal', async ($, on) => {
  let drawn = ''
  on('ui.render', ($, e) => {
    drawn = (e.props as { text: string }).text
    const { Text } = $.ui.resolve(e)
    return <Text>{drawn}</Text>
  })
  const ui = await $.ui.mount(MSG('terminal', 'So $x^2 + \\alpha$ costs $5 and $10, and `$y$` stays.'))
  expect(drawn).toBe('So x² + α costs $5 and $10, and `$y$` stays.')
  await ui.unmount()
})

test('other surfaces get the text untouched', async ($, on) => {
  let drawn = ''
  on('ui.render', ($, e) => {
    drawn = (e.props as { text: string }).text
    const { Text } = $.ui.resolve(e)
    return <Text>{drawn}</Text>
  })
  const ui = await $.ui.mount(MSG('desktop', '$x^2$'))
  expect(drawn).toBe('$x^2$')
  await ui.unmount()
})

test('the ambiguousWide setting reaches the converter', { options: { ambiguousWide: true } }, async ($, on) => {
  let drawn = ''
  on('ui.render', ($, e) => {
    drawn = (e.props as { text: string }).text
    const { Text } = $.ui.resolve(e)
    return <Text>{drawn}</Text>
  })
  const ui = await $.ui.mount(MSG('terminal', '$$\\boxed{x}$$'))
  expect(drawn).toBe('```\n┌──┐\n│ x  │\n└──┘\n```\n')
  await ui.unmount()
})

test('/latex-render source shows replies as source, and again switches back', async ($, on) => {
  let drawn = ''
  on('ui.render', ($, e) => {
    drawn = (e.props as { text: string }).text
    const { Text } = $.ui.resolve(e)
    return <Text>{drawn}</Text>
  })
  on('command.register', () => ({ value: { command: 'latex-render' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const run = { command: 'latex-render', args: 'source', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const
  const shown = await $.command.run(run)
  expect(shown.text).toMatch(/LaTeX source/)
  let ui = await $.ui.mount(MSG('terminal', '$x^2$'))
  expect(drawn).toBe('$x^2$')
  await ui.unmount()

  await $.command.run(run)
  ui = await $.ui.mount(MSG('terminal', '$x^2$'))
  expect(drawn).toBe('x²')
  await ui.unmount()
})
