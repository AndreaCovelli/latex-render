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
