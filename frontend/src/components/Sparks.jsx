import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'

// A one-shot burst of sparks from a point on screen (x, y in viewport pixels).
// One full-screen canvas, capped at 60fps; it stops and calls onDone when the last spark fades.

const DEFAULT_COLOURS = ['#ff6b2c', '#ffc23d', '#ffd27a', '#14c2d0', '#ffffff']

export default function Sparks({ x, y, count = 40, power = 1, colours = DEFAULT_COLOURS, onDone }) {
  const canvasRef = useRef(null)
  const reduce = useReducedMotion()
  const done = useRef(onDone)

  useEffect(() => {
    done.current = onDone
  }, [onDone])

  useEffect(() => {
    if (reduce) {
      done.current?.()
      return
    }
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const sparks = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = (2 + Math.random() * 6) * power
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5 * power,
        life: 0,
        max: 40 + Math.random() * 40,
        size: 1.5 + Math.random() * 2.5,
        streak: Math.random() < 0.5,
        colour: colours[Math.floor(Math.random() * colours.length)],
      }
    })

    let frame = 0
    let last = 0
    const tick = (time) => {
      if (time - last < 1000 / 60 - 1) {
        frame = requestAnimationFrame(tick)
        return
      }
      last = time
      ctx.clearRect(0, 0, w, h)
      let alive = 0
      for (const s of sparks) {
        if (s.life > s.max) continue
        alive++
        s.life++
        s.vx *= 0.96
        s.vy = s.vy * 0.96 + 0.14
        s.x += s.vx
        s.y += s.vy
        ctx.globalAlpha = Math.max(0, 1 - s.life / s.max)
        ctx.fillStyle = s.colour
        ctx.save()
        ctx.translate(s.x, s.y)
        if (s.streak) {
          ctx.rotate(Math.atan2(s.vy, s.vx))
          ctx.fillRect(-s.size * 2, -0.7, s.size * 4, 1.4)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, s.size / 1.6, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      if (alive) frame = requestAnimationFrame(tick)
      else done.current?.()
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [x, y, count, power, colours, reduce])

  if (reduce) return null
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] size-full" />
}
