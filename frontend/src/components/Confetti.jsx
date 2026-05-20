import { useEffect, useRef } from 'react'

// Canvas-based confetti burst. Renders only while `fire` is truthy, then unmounts itself.
// Usage: <Confetti fire={trigger} onDone={() => setTrigger(false)} />
const COLORS = ['#7C3AED', '#FBBF24', '#34D399', '#FB7185', '#38BDF8', '#A855F7', '#F59E0B']

export default function Confetti({ fire, onDone, durationMs = 2500, count = 140 }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!fire) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = window.innerWidth
    const H = window.innerHeight
    // Two emitters: bottom-left and bottom-right, shooting upward.
    const pieces = []
    for (let i = 0; i < count; i++) {
      const fromLeft = i < count / 2
      pieces.push({
        x: fromLeft ? 40 : W - 40,
        y: H - 40,
        vx: (fromLeft ? 1 : -1) * (Math.random() * 5 + 4),
        vy: -(Math.random() * 9 + 10),
        g: 0.35,
        size: Math.random() * 7 + 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.4,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      })
    }

    const t0 = performance.now()
    let raf = 0
    const tick = (t) => {
      const elapsed = t - t0
      ctx.clearRect(0, 0, W, H)
      for (const p of pieces) {
        p.x += p.vx
        p.y += p.vy
        p.vy += p.g
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      if (elapsed < durationMs) {
        raf = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, W, H)
        if (onDone) onDone()
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [fire, durationMs, count, onDone])

  if (!fire) return null
  return <canvas ref={ref} className="confetti-canvas" aria-hidden="true" />
}
