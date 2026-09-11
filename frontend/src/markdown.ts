import type { Element, Root, Text } from 'hast'
import { visit } from 'unist-util-visit'
import { localImageUrl } from './api'

const REMOTE_PROTOCOL = /^(?:https?:|data:)/i
const UNSAFE_PROTOCOL = /^(?:javascript:|vbscript:|file:)/i

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

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'section'
  )
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
      if (/^h[1-6]$/.test(node.tagName)) {
        const base = slugify(textContent(node))
        const seen = slugs.get(base) ?? 0
        slugs.set(base, seen + 1)
        node.properties.id = seen ? `${base}-${seen + 1}` : base
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
