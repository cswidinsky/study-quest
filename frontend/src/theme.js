import { useEffect, useSyncExternalStore } from 'react'
import { prefersReducedMotion } from './lib/motion.js'

// Theme = the data-theme attribute on <html>. First visit follows the system;
// once you press the button, your choice is saved and wins.

const STORAGE_KEY = 'theme'
const root = () => document.documentElement
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)')

function readSaved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? saved : null
  } catch {
    return null
  }
}

function save(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage blocked (private mode): the switch still works for this visit.
  }
}

// Any component can read the current theme; it re-renders when the attribute changes.
function subscribe(callback) {
  const observer = new MutationObserver(callback)
  observer.observe(root(), { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}
export const useTheme = () => useSyncExternalStore(subscribe, () => root().dataset.theme ?? 'light')

// While you haven't chosen, keep following the OS (e.g. automatic dark mode at sunset).
export function useFollowSystemTheme() {
  useEffect(() => {
    const query = systemDark()
    const onChange = () => {
      if (!readSaved()) root().dataset.theme = query.matches ? 'dark' : 'light'
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
}

// Flip the theme. The new theme is revealed as a circle growing out of `origin` ({ x, y }).
export function toggleTheme(origin) {
  const next = root().dataset.theme === 'dark' ? 'light' : 'dark'
  save(next)
  const apply = () => {
    root().dataset.theme = next
  }

  if (!document.startViewTransition || prefersReducedMotion()) {
    apply()
    return
  }

  root().dataset.vt = 'theme'
  const transition = document.startViewTransition(apply)
  transition.ready.then(() => {
    const { x, y } = origin
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    root().animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 700, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', pseudoElement: '::view-transition-new(root)' },
    )
  })
  transition.finished.finally(() => {
    if (root().dataset.vt === 'theme') delete root().dataset.vt
  })
}
