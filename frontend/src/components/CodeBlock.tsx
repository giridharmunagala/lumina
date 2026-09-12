import { AlertTriangle, Check, Copy, Loader2, Sparkles, Undo2, WrapText } from 'lucide-react'
import { type ReactNode, isValidElement, useMemo, useRef, useState } from 'react'
import { canFormat, formatCode } from '../lib/formatCode'
import { Mermaid } from './Mermaid'

function languageOf(children: ReactNode): string {
  if (!isValidElement<{ className?: string }>(children)) return ''
  const className = children.props.className ?? ''
  const match = /language-([\w+#-]+)/.exec(className)
  return match ? match[1] : ''
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

async function highlight(code: string, language: string): Promise<string | null> {
  try {
    const { default: hljs } = await import('highlight.js/lib/common')
    if (!hljs.getLanguage(language)) return null
    return hljs.highlight(code, { language }).value
  } catch {
    return null
  }
}

export function CodeBlock({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const [formatted, setFormatted] = useState<{ code: string; html: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [issue, setIssue] = useState('')
  const [wrap, setWrap] = useState(false)
  const language = languageOf(children)
  const source = useMemo(() => textOf(children).replace(/\n$/, ''), [children])

  if (language === 'mermaid') return <Mermaid code={source} />

  const formattable = canFormat(language)

  const copy = async () => {
    const text = formatted ? formatted.code : (ref.current?.innerText ?? source)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const prettify = async () => {
    if (formatted) {
      setFormatted(null)
      setIssue('')
      return
    }
    setBusy(true)
    setIssue('')
    try {
      const code = await formatCode(source, language)
      setFormatted({ code, html: await highlight(code, language) })
    } catch (error) {
      setIssue(error instanceof Error ? error.message : 'Could not format this block.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="code-block">
      <div className="code-bar">
        <span className="code-language">{language || 'text'}</span>
        <div className="code-actions">
          <button
            className={`code-action ${wrap ? 'is-active' : ''}`}
            onClick={() => setWrap((value) => !value)}
            aria-pressed={wrap}
            title="Toggle line wrapping"
          >
            <WrapText aria-hidden="true" />
            <span>Wrap</span>
          </button>
          {formattable && (
            <button
              className="code-action"
              onClick={() => void prettify()}
              disabled={busy}
              title={formatted ? 'Show the original source' : `Pretty-print this ${language} block`}
            >
              {busy ? (
                <Loader2 className="spin" aria-hidden="true" />
              ) : formatted ? (
                <Undo2 aria-hidden="true" />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              <span>{formatted ? 'Original' : 'Format'}</span>
            </button>
          )}
          <button className="code-action" onClick={() => void copy()} aria-label="Copy code">
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      {issue && (
        <p className="code-issue" role="status">
          <AlertTriangle aria-hidden="true" /> {issue}
        </p>
      )}
      {formatted ? (
        <pre className={wrap ? 'wrap' : ''}>
          {formatted.html ? (
            <code className={`hljs language-${language}`} dangerouslySetInnerHTML={{ __html: formatted.html }} />
          ) : (
            <code className={`hljs language-${language}`}>{formatted.code}</code>
          )}
        </pre>
      ) : (
        <pre ref={ref} className={wrap ? 'wrap' : ''}>
          {children}
        </pre>
      )}
    </div>
  )
}
