import Lenis from 'lenis'
import { prefersReducedMotion } from './motion.js'

// Smooth, inertial scrolling (Lenis). It still moves the real page scroll,
// so scroll position, anchors and motion's useScroll all keep working.
// Off for reduced motion; touch devices keep their native scroll.

let lenis = null

export function startSmoothScroll() {
  if (lenis || prefersReducedMotion()) return () => {}
  lenis = new Lenis({ autoRaf: true, lerp: 0.09, wheelMultiplier: 0.9 })
  return () => {
    lenis?.destroy()
    lenis = null
  }
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}

export function scrollToElement(el, offset = -24) {
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.2 })
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

// Freeze page scroll while a sheet or dialog is open.
export function lockScroll(locked) {
  if (lenis) (locked ? lenis.stop() : lenis.start())
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}
