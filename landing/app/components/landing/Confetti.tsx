'use client'

import { useEffect, useRef } from 'react'
import { C } from './theme'

// Subtle, continuously drifting "calendar event" confetti that spills from the
// nav bar and falls behind the page content.

const COLORS = [C.mint, C.lavender, C.butter, C.blue, C.orange];
const COUNT = 14;
const NAV_H = 0;

type Piece = {
  x: number
  y: number
  width: number
  color: string
  fallSpeed: number
  swayAmp: number
  swayFreq: number
  swayPhase: number
  rotation: number
  rotationSpeed: number
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Draws a tiny event chip centered on the current transform origin: a rounded
// color block with two faint "text" lines, like a calendar event.
function drawEventChip(ctx: CanvasRenderingContext2D, w: number, color: string) {
  const h = w * 0.62
  const x = -w / 2
  const y = -h / 2

  ctx.globalAlpha = 0.9
  ctx.fillStyle = color
  roundRectPath(ctx, x, y, w, h, 3)
  ctx.fill()

  // Faint text lines.
  ctx.globalAlpha = 0.32
  ctx.fillStyle = C.ink
  const pad = w * 0.16
  const lineH = Math.max(1.2, h * 0.11)
  roundRectPath(ctx, x + pad, y + h * 0.3, w * 0.58, lineH, lineH / 2)
  ctx.fill()
  roundRectPath(ctx, x + pad, y + h * 0.58, w * 0.38, lineH, lineH / 2)
  ctx.fill()
}

export function Confetti({ boundaryRef }: { boundaryRef?: React.RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // Recycled pieces re-enter from the nav band so they appear to fall from it.
    // On first load most pieces start in/above the nav so they pour out of it,
    // with a few pre-spread down the page so it isn't empty.
    const initialY = () => (Math.random() < 0.75 ? rand(-180, NAV_H) : rand(NAV_H, height))

    const makePiece = (initial: boolean): Piece => ({
      x: rand(0, width),
      y: initial ? initialY() : rand(0, NAV_H),
      width: rand(16, 26),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      fallSpeed: rand(18, 34),
      swayAmp: rand(8, 22),
      swayFreq: rand(0.4, 0.9),
      swayPhase: rand(0, Math.PI * 3),
      rotation: rand(0, Math.PI * 2),
      rotationSpeed: rand(-0.5, 0.5),
    })

    const pieces = Array.from({ length: COUNT }, () => makePiece(true))

    let last = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      ctx.clearRect(0, 0, width, height)

      // Clip rendering to the boundary element's on-screen height (the hero), so
      // confetti is cut off at the hero's bottom edge and hidden once it scrolls away.
      const boundary = boundaryRef?.current
      const clipBottom = boundary
        ? Math.max(0, Math.min(height, boundary.getBoundingClientRect().bottom))
        : height
      const visible = clipBottom > 0

      if (visible) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, width, clipBottom)
        ctx.clip()
      }

      for (const p of pieces) {
        p.y += p.fallSpeed * dt
        p.swayPhase += p.swayFreq * dt
        p.rotation += p.rotationSpeed * dt

        if (p.y - p.width > height) {
          p.y = rand(0, NAV_H)
          p.x = rand(0, width)
        }

        if (!visible) continue

        const drawX = p.x + Math.sin(p.swayPhase) * p.swayAmp

        ctx.save()
        ctx.translate(drawX, p.y)
        ctx.rotate(p.rotation)
        drawEventChip(ctx, p.width, p.color)
        ctx.restore()
      }

      if (visible) ctx.restore()

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [boundaryRef])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-0" />
}
