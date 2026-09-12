import { AlertTriangle, Code2, Download, Maximize2, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDocumentTheme } from '../hooks/useDocumentTheme'
import { renderMermaid } from '../lib/mermaid'

function download(svg: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'diagram.svg'
  link.click()
  URL.revokeObjectURL(url)
}

export function Mermaid({ code }: { code: string }) {
  const theme = useDocumentTheme()
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [showSource, setShowSource] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    setError('')
    renderMermaid(code, theme)
      .then((result) => {
        if (active) setSvg(result)
      })
      .catch((issue: Error) => {
        if (!active) return
        setSvg('')
        setError(issue.message)
      })
    return () => {
      active = false
    }
  }, [code, theme])

  useEffect(() => {
    if (!zoomed) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomed(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  const retry = useCallback(() => {
    setError('')
    renderMermaid(code, theme)
      .then(setSvg)
      .catch((issue: Error) => setError(issue.message))
  }, [code, theme])

  const diagram = (
    <div
      className="mermaid-figure"
      ref={frame}
      role="img"
      aria-label="Mermaid diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )

  return (
    <div className={`code-block mermaid-block ${error ? 'has-error' : ''}`}>
      <div className="code-bar">
        <span className="code-language">diagram</span>
        <div className="code-actions">
          <button className="code-action" onClick={() => setShowSource((value) => !value)}>
            <Code2 aria-hidden="true" />
            <span>{showSource ? 'Diagram' : 'Source'}</span>
          </button>
          {svg && !showSource && (
            <>
              <button className="code-action" onClick={() => setZoomed(true)} aria-label="Expand diagram">
                <Maximize2 aria-hidden="true" />
                <span>Expand</span>
              </button>
              <button className="code-action" onClick={() => download(svg)} aria-label="Download diagram as SVG">
                <Download aria-hidden="true" />
                <span>SVG</span>
              </button>
            </>
          )}
          {error && (
            <button className="code-action" onClick={retry}>
              <RefreshCw aria-hidden="true" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
      {showSource || (!svg && !error) ? (
        <pre className="mermaid-source">
          <code>{code}</code>
        </pre>
      ) : error ? (
        <div className="mermaid-error">
          <p>
            <AlertTriangle aria-hidden="true" /> {error}
          </p>
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      ) : (
        diagram
      )}
      {zoomed && (
        <div className="mermaid-lightbox" role="dialog" aria-modal="true" aria-label="Diagram preview">
          <button className="mermaid-close" onClick={() => setZoomed(false)} aria-label="Close diagram preview">
            <X aria-hidden="true" />
          </button>
          <div className="mermaid-lightbox-inner" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      )}
    </div>
  )
}
