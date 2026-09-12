import { type RefObject, useEffect, useState } from 'react'
import type { Heading } from '../lib/types'

/** Collect headings rendered inside the document body. */
export function useHeadings(container: RefObject<HTMLElement>, dependency: unknown): Heading[] {
  const [headings, setHeadings] = useState<Heading[]>([])
  useEffect(() => {
    const node = container.current
    if (!dependency || !node) {
      setHeadings([])
      return
    }
    const collect = () => {
      const found = Array.from(node.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')).map(
        (heading) => ({
          id: heading.id,
          text: heading.textContent?.replace(/#$/, '').trim() ?? '',
          level: Number(heading.tagName.slice(1)),
        }),
      )
      setHeadings(found)
    }
    collect()
    const observer = new MutationObserver(collect)
    observer.observe(node, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [container, dependency])
  return headings
}

/** Track scroll progress and the heading closest to the top of the viewport. */
export function useReadingPosition(
  scroller: RefObject<HTMLElement>,
  headings: Heading[],
): { progress: number; activeId: string } {
  const [progress, setProgress] = useState(0)
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const node = scroller.current
    if (!node) return
    let frame = 0
    const measure = () => {
      frame = 0
      const scrollable = node.scrollHeight - node.clientHeight
      setProgress(scrollable > 8 ? Math.min(1, Math.max(0, node.scrollTop / scrollable)) : 0)
      if (!headings.length) {
        setActiveId('')
        return
      }
      if (scrollable > 8 && node.scrollTop >= scrollable - 2) {
        setActiveId(headings[headings.length - 1].id)
        return
      }
      const top = node.getBoundingClientRect().top + 96
      let current = headings[0].id
      for (const heading of headings) {
        const element = document.getElementById(heading.id)
        if (element && element.getBoundingClientRect().top <= top) current = heading.id
      }
      setActiveId(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    node.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      node.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [scroller, headings])

  return { progress, activeId }
}
