import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { CodeBlock } from './CodeBlock'

vi.mock('../lib/mermaid', () => ({
  renderMermaid: vi.fn(async (code: string) => {
    if (code.includes('boom')) throw new Error('Parse error on line 1')
    return '<svg data-testid="diagram"></svg>'
  }),
  isDarkTheme: () => true,
}))

function block(language: string, code: string) {
  return (
    <CodeBlock>
      <code className={`language-${language}`}>{code}</code>
    </CodeBlock>
  )
}

describe('CodeBlock', () => {
  it('labels the language and offers copy and wrap actions', () => {
    render(block('python', 'print("hi")'))
    expect(screen.getByText('python')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy code/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /wrap/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('hides the format action for languages it cannot pretty-print', () => {
    render(block('text', 'plain'))
    expect(screen.queryByRole('button', { name: /format/i })).not.toBeInTheDocument()
  })

  it('pretty-prints JSON and can restore the original', async () => {
    render(block('json', '{"b":1,"a":2}'))
    fireEvent.click(screen.getByRole('button', { name: /format/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /original/i })).toBeInTheDocument())
    expect(document.querySelector('pre')?.textContent).toContain('{ "b": 1, "a": 2 }')
    fireEvent.click(screen.getByRole('button', { name: /original/i }))
    expect(document.querySelector('pre')?.textContent).toBe('{"b":1,"a":2}')
  })

  it('surfaces a friendly message when formatting fails', async () => {
    render(block('json', '{oops'))
    fireEvent.click(screen.getByRole('button', { name: /format/i }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Could not format/))
  })

  it('renders mermaid fences as diagrams with a source toggle', async () => {
    render(block('mermaid', 'graph TD; A-->B;'))
    await waitFor(() => expect(screen.getByRole('img', { name: /mermaid diagram/i })).toBeInTheDocument())
    expect(screen.getByText('diagram')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /source/i }))
    expect(screen.getByText('graph TD; A-->B;')).toBeInTheDocument()
  })

  it('falls back to the source when a diagram cannot be parsed', async () => {
    render(block('mermaid', 'graph boom'))
    await waitFor(() => expect(screen.getByText(/Parse error on line 1/)).toBeInTheDocument())
    expect(screen.getByText('graph boom')).toBeInTheDocument()
  })
})
