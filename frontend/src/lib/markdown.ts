import type { Element, Root, Text } from 'hast'
import { visit } from 'unist-util-visit'
import { localImageUrl } from './api'

const REMOTE_PROTOCOL = /^(?:https?:|data:)/i
const UNSAFE_PROTOCOL = /^(?:javascript:|vbscript:|file:)/i
const ALERT = /^\[!(note|tip|important|warning|caution)\]\s*/i

export const ALERT_KINDS = ['note', 'tip', 'important', 'warning', 'caution'] as const
export type AlertKind = (typeof ALERT_KINDS)[number]

export function resolveMarkdownImage(source: string, fileId: string): string {
  const value = source.trim()
  if (!value || value.startsWith('#') || UNSAFE_PROTOCOL.test(value)) return ''
  if (REMOTE_PROTOCOL.test(value) || value.startsWith('//')) return value
  return localImageUrl(fileId, value)
}

function textContent(node: Element): string {
  let text = ''
  visit(node, 'text', (child: Text) => {
    text += child.value
  })
  return text
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'section'
  )
}

/** Turn `> [!NOTE]` blockquotes into labelled callouts. */
function applyAlert(node: Element): void {
  const paragraph = node.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'p',
  )
  const first = paragraph?.children[0]
  if (!paragraph || !first || first.type !== 'text') return
  const match = ALERT.exec(first.value)
  if (!match) return
  const kind = match[1].toLowerCase() as AlertKind
  first.value = first.value.slice(match[0].length).replace(/^\n/, '')
  if (!first.value.trim()) paragraph.children.shift()
  if (!paragraph.children.length) node.children.splice(node.children.indexOf(paragraph), 1)
  node.properties.className = ['callout', `callout-${kind}`]
  node.properties['data-callout'] = kind
}

export function rehypeReader(fileId: string) {
  return (tree: Root) => {
    const slugs = new Map<string, number>()
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'img') {
        const source = typeof node.properties.src === 'string' ? node.properties.src : ''
        node.properties.src = resolveMarkdownImage(source, fileId)
        node.properties.loading = 'lazy'
        node.properties.decoding = 'async'
      }
      if (node.tagName === 'blockquote') {
        applyAlert(node)
      }
      if (/^h[1-6]$/.test(node.tagName)) {
        const text = textContent(node)
        const base = slugify(text)
        const seen = slugs.get(base) ?? 0
        slugs.set(base, seen + 1)
        const id = seen ? `${base}-${seen + 1}` : base
        node.properties.id = id
        node.properties.tabIndex = -1
        node.children.push({
          type: 'element',
          tagName: 'a',
          properties: {
            className: ['heading-anchor'],
            href: `#${id}`,
            ariaLabel: `Link to section ${text}`.trim(),
          },
          children: [{ type: 'text', value: '#' }],
        })
      }
      if (node.tagName === 'a') {
        const href = typeof node.properties.href === 'string' ? node.properties.href : ''
        if (/^https?:/i.test(href)) {
          node.properties.target = '_blank'
          node.properties.rel = ['noopener', 'noreferrer']
        }
      }
    })
  }
}
