/**
 * Lazily loaded pretty-printing for fenced code blocks. Prettier and its
 * parsers are only fetched when a reader actually formats a block.
 */

import type { Plugin } from 'prettier'

type PluginLoader = () => Promise<unknown>

interface Formatter {
  parser: string
  plugins: PluginLoader[]
}

const estree: PluginLoader = () => import('prettier/plugins/estree')
const babel: PluginLoader = () => import('prettier/plugins/babel')
const typescript: PluginLoader = () => import('prettier/plugins/typescript')
const postcss: PluginLoader = () => import('prettier/plugins/postcss')
const html: PluginLoader = () => import('prettier/plugins/html')
const yaml: PluginLoader = () => import('prettier/plugins/yaml')
const markdown: PluginLoader = () => import('prettier/plugins/markdown')
const graphql: PluginLoader = () => import('prettier/plugins/graphql')

const FORMATTERS: Record<string, Formatter> = {
  json: { parser: 'json', plugins: [babel, estree] },
  jsonc: { parser: 'json', plugins: [babel, estree] },
  json5: { parser: 'json5', plugins: [babel, estree] },
  javascript: { parser: 'babel', plugins: [babel, estree] },
  js: { parser: 'babel', plugins: [babel, estree] },
  jsx: { parser: 'babel', plugins: [babel, estree] },
  mjs: { parser: 'babel', plugins: [babel, estree] },
  typescript: { parser: 'typescript', plugins: [typescript, estree] },
  ts: { parser: 'typescript', plugins: [typescript, estree] },
  tsx: { parser: 'typescript', plugins: [typescript, estree] },
  css: { parser: 'css', plugins: [postcss] },
  scss: { parser: 'scss', plugins: [postcss] },
  less: { parser: 'less', plugins: [postcss] },
  html: { parser: 'html', plugins: [html] },
  xml: { parser: 'html', plugins: [html] },
  vue: { parser: 'vue', plugins: [html] },
  yaml: { parser: 'yaml', plugins: [yaml] },
  yml: { parser: 'yaml', plugins: [yaml] },
  markdown: { parser: 'markdown', plugins: [markdown] },
  md: { parser: 'markdown', plugins: [markdown] },
  graphql: { parser: 'graphql', plugins: [graphql] },
  gql: { parser: 'graphql', plugins: [graphql] },
}

export function canFormat(language: string): boolean {
  return language.toLowerCase() in FORMATTERS
}

export function formatterFor(language: string): Formatter | undefined {
  return FORMATTERS[language.toLowerCase()]
}

/** Pretty-print source text, throwing a readable error when it cannot be parsed. */
export async function formatCode(source: string, language: string, printWidth = 80): Promise<string> {
  const formatter = formatterFor(language)
  if (!formatter) throw new Error(`Lumina cannot format ${language || 'this'} code.`)
  const [prettier, ...plugins] = await Promise.all([
    import('prettier/standalone'),
    ...formatter.plugins.map((load) => load()),
  ])
  try {
    const result = await prettier.format(source, {
      parser: formatter.parser,
      plugins: plugins as Plugin[],
      printWidth,
      semi: true,
      singleQuote: false,
    })
    return result.replace(/\n$/, '')
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : 'Unknown parse error'
    throw new Error(`Could not format this block: ${message}`)
  }
}
