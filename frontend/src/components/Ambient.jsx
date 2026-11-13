import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { prefersReducedMotion } from '../lib/motion.js'

// The world behind the app, in three depth layers:
//  1. Far:  three huge pools of coloured light drifting slowly (CSS only, GPU transforms).
//  2. Mid:  dust-like particles floating up, each at its own depth (one canvas).
//  3. Near: a faint film grain.
// Scrolling moves the layers at different speeds (parallax). The canvas is capped
// at 60fps, sleeps when the tab is hidden, and stays still for reduced motion.

export default function Ambient() {
  const { scrollY } = useScroll()
  const farY = useTransform(scrollY, (v) => v * -0.06)

  return (
    <div className="vt-ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <motion.div className="absolute inset-0" style={{ y: farY }}>
        <div className="ambient-blob a" />
        <div className="ambient-blob b" />
        <div className="ambient-blob c" />
      </motion.div>
      <Particles />
      <div className="ambient-grain" />
    </div>
  )
}

const FRAME_MS = 1000 / 60

function Particles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const still = prefersReducedMotion()
    let width = 0
    let height = 0
    let dots = []
    let colour = '255 255 255'
    let alpha = 0.5
    let frame = 0
    let last = 0

    const readColours = () => {
      const styles = getComputedStyle(document.documentElement)
      colour = styles.getPropertyValue('--particle').trim() || '255 255 255'
      alpha = parseFloat(styles.getPropertyValue('--particle-alpha')) || 0.5
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = width < 640 ? 28 : 60
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: 0.25 + Math.random() * 0.75, // depth: near dots are bigger, faster, brighter
        sway: Math.random() * Math.PI * 2,
      }))
    }

    const draw = (time) => {
      const scroll = window.scrollY
      ctx.clearRect(0, 0, width, height)
      for (const d of dots) {
        if (!still) {
          d.y -= 0.12 * d.z
          d.sway += 0.004
          if (d.y < -10) {
            d.y = height + 10
            d.x = Math.random() * width
          }
        }
        const x = d.x + Math.sin(d.sway + time * 0.0002) * 12 * d.z
        const y = (((d.y - scroll * 0.25 * d.z) % (height + 20)) + height + 20) % (height + 20) - 10
        ctx.beginPath()
        ctx.arc(x, y, 0.5 + d.z * 1.4, 0, Math.PI * 2)
        ctx.fillStyle = `rgb(${colour} / ${alpha * d.z})`
        ctx.fill()
      }
    }

    const loop = (time) => {
      frame = requestAnimationFrame(loop)
      if (time - last < FRAME_MS - 1) return // 60fps cap on 120Hz screens
      last = time
      draw(time)
    }

    const onVisibility = () => {
      cancelAnimationFrame(frame)
      if (!document.hidden && !still) frame = requestAnimationFrame(loop)
    }

    const themeObserver = new MutationObserver(() => {
      readColours()
      if (still) draw(0)
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    readColours()
    resize()
    if (still) draw(0)
    else frame = requestAnimationFrame(loop)

    const onResize = () => {
      resize()
      if (still) draw(0)
    }
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(frame)
      themeObserver.disconnect()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 size-full" />
}
