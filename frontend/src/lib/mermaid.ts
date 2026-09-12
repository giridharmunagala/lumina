/**
 * Lazily loaded Mermaid rendering. The library is only fetched when a document
 * actually contains a `mermaid` code fence.
 */

type MermaidModule = typeof import('mermaid')['default']

let mermaidPromise: Promise<MermaidModule> | null = null
let currentTheme = ''
let counter = 0

const DARK_THEMES = new Set(['dark', 'nord', 'solarized-dark'])

export function isDarkTheme(theme: string): boolean {
  return DARK_THEMES.has(theme)
}

function variables(styles: CSSStyleDeclaration, dark: boolean) {
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
  const surface = read('--surface-2', dark ? '#16202f' : '#f1f3f8')
  const text = read('--text', dark ? '#eef3fb' : '#141c2c')
  const border = read('--border-strong', dark ? '#2e3f5c' : '#ccd4e2')
  const accent = read('--accent', '#7aa9ff')
  return {
    background: 'transparent',
    primaryColor: surface,
    primaryTextColor: text,
    primaryBorderColor: accent,
    secondaryColor: read('--surface', surface),
    tertiaryColor: read('--bg-elevated', surface),
    lineColor: border,
    textColor: text,
    mainBkg: surface,
    nodeBorder: accent,
    clusterBkg: read('--surface', surface),
    clusterBorder: border,
    titleColor: text,
    edgeLabelBackground: read('--bg-elevated', surface),
    fontFamily: read('--font-sans', 'Inter, system-ui, sans-serif'),
    fontSize: '14px',
  }
}

async function load(theme: string): Promise<MermaidModule> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((module) => module.default)
  }
  const mermaid = await mermaidPromise
  if (theme !== currentTheme) {
    currentTheme = theme
    const dark = isDarkTheme(theme)
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      darkMode: dark,
      themeVariables: variables(getComputedStyle(document.documentElement), dark),
    })
  }
  return mermaid
}

/** Render Mermaid source to an SVG string, rejecting with a readable message. */
export async function renderMermaid(source: string, theme: string): Promise<string> {
  const mermaid = await load(theme)
  counter += 1
  const id = `lumina-mermaid-${counter}`
  try {
    const { svg } = await mermaid.render(id, source.trim())
    return svg
  } catch (error) {
    document.getElementById(`d${id}`)?.remove()
    const message = error instanceof Error ? error.message.split('\n')[0] : 'Invalid diagram'
    throw new Error(message)
  }
}

/** Reset cached state; used by tests. */
export function resetMermaid(): void {
  mermaidPromise = null
  currentTheme = ''
}
