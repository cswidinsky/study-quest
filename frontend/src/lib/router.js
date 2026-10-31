import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { prefersReducedMotion } from './motion.js'
import { scrollToTop } from './smoothScroll.js'

// A tiny hash router: #/, #/new, #/deck/<id>.
// Every screen change runs inside a View Transition: the browser snapshots the
// old screen, React renders the new one, and CSS (index.css) choreographs the
// switch. Elements with the same name on both screens morph into each other.

const readPath = () => window.location.hash.replace(/^#/, '') || '/'

export function matchRoute(path) {
  if (path === '/') return { name: 'home', params: {} }
  if (path === '/new') return { name: 'new', params: {} }
  const deck = path.match(/^\/deck\/([\w-]+)$/)
  if (deck) return { name: 'deck', params: { id: deck[1] } }
  return { name: 'home', params: {} }
}

export function useHashRoute() {
  const [path, setPath] = useState(readPath)

  useEffect(() => {
    const onChange = () => {
      const next = readPath()
      const update = () => {
        flushSync(() => setPath(next))
        scrollToTop()
      }
      if (!document.startViewTransition || prefersReducedMotion()) {
        update()
        return
      }
      const root = document.documentElement
      root.dataset.vt = 'route'
      const transition = document.startViewTransition(update)
      transition.finished.finally(() => {
        if (root.dataset.vt === 'route') delete root.dataset.vt
      })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return path
}

export const navigate = (path) => {
  window.location.hash = path
}
