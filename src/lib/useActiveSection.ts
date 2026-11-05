import { useEffect, useState } from 'react'

// The id of the home section being read, or null above the first one (the hero) and when disabled.
export function useActiveSection(ids: readonly string[], enabled: boolean, hash: string): string | null {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    // Browsers already fire scroll at most once per frame, and this only reads a few rects.
    const update = () => {
      // A section counts as current once its top passes the point where links land (index.css scroll-padding-top,
      // which follows the root font size) plus a little room.
      const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 16
      let current: string | null = null
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top
        if (top !== undefined && top <= offset) current = id
      }
      // Short last sections never reach the top. At the bottom, keep the linked section if its top is on screen
      // (the user just jumped there); an older link whose section has scrolled away does not count.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        const linked = hash.slice(1)
        const top = ids.includes(linked) ? document.getElementById(linked)?.getBoundingClientRect().top : undefined
        current = top !== undefined && top >= 0 && top < window.innerHeight ? linked : ids[ids.length - 1]
      }
      setActive(current)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      // So a later return to the home page does not show the old section for a frame.
      setActive(null)
    }
  }, [ids, enabled, hash])

  return enabled ? active : null
}
