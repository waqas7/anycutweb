import { useEffect, useRef, useState } from 'react'
import type { IsoPanel } from '../domain/cabinetAssembly'
import './ExplodedCabinetPreview.css'

export function ExplodedCabinetPreview({
  panels,
  tall = false,
  narrow = false,
  wide = false,
}: {
  panels: IsoPanel[]
  tall?: boolean
  narrow?: boolean
  wide?: boolean
}) {
  const [explode, setExplode] = useState(0.28)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeIndex =
    panels.length === 0
      ? 0
      : Math.min(
          panels.length - 1,
          Math.max(0, Math.floor(explode * Math.max(1, panels.length - 1))),
        )
  const active = panels[activeIndex]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const dpr = window.devicePixelRatio || 1
    const cssW = parent.clientWidth
    const cssH = parent.clientHeight
    canvas.width = Math.max(1, Math.floor(cssW * dpr))
    canvas.height = Math.max(1, Math.floor(cssH * dpr))
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const faceH = tall ? cssH * 0.62 : cssH * 0.56
    const faceW = wide ? cssW * 0.48 : narrow ? cssW * 0.3 : tall ? cssW * 0.34 : cssW * 0.42
    const depthOff = Math.min(cssW, cssH) * 0.048
    const baseLeft = (cssW - faceW - depthOff) * 0.5
    const baseTop = (cssH - faceH + depthOff * 0.32) * 0.42

    panels.forEach((part, index) => {
      const ox = part.explodeX * explode * cssW * 0.85
      const oy = part.explodeY * explode * cssH * 0.85
      const highlighted = index === activeIndex
      const fill = highlighted
        ? 'rgba(230, 81, 0, 0.42)'
        : part.isDoor
          ? 'rgba(215, 204, 200, 0.68)'
          : part.isBack
            ? 'rgba(215, 204, 200, 0.5)'
            : 'rgba(188, 170, 164, 0.9)'
      const stroke = highlighted ? 'rgba(93, 64, 55, 0.95)' : 'rgba(93, 64, 55, 0.55)'
      drawIsoPanel(
        ctx,
        baseLeft + part.localX * faceW + ox,
        baseTop + part.localY * faceH + oy,
        Math.max(1.5, part.widthFrac * faceW),
        Math.max(1.5, part.heightFrac * faceH),
        Math.max(1.2, depthOff * part.depthScale),
        fill,
        stroke,
        highlighted ? 1.8 : 1.1,
      )
    })
  }, [panels, explode, activeIndex, tall, narrow, wide])

  return (
    <div className="explode-preview">
      <div className="explode-preview__head">
        <strong>3D explode</strong>
        <span>
          {panels.length === 0 ? '' : `${activeIndex + 1} / ${panels.length}`}
        </span>
      </div>
      <div className="explode-preview__canvas-wrap">
        <canvas ref={canvasRef} />
      </div>
      <p className="explode-preview__label">
        {active?.label || 'Move the slider to explode parts'}
      </p>
      {active?.sizeCaption && (
        <p className="explode-preview__caption">{active.sizeCaption}</p>
      )}
      <p className="explode-preview__hint">Assembled ← → Exploded</p>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={explode}
        onChange={(e) => setExplode(Number(e.target.value))}
        aria-label="Explode amount"
      />
    </div>
  )
}

function drawIsoPanel(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  depthOff: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
) {
  const dy = depthOff * 0.3
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = strokeWidth

  ctx.beginPath()
  ctx.rect(left, top, width, height)
  ctx.fill()
  ctx.stroke()

  // Top face
  ctx.beginPath()
  ctx.moveTo(left, top)
  ctx.lineTo(left + depthOff, top - dy)
  ctx.lineTo(left + width + depthOff, top - dy)
  ctx.lineTo(left + width, top)
  ctx.closePath()
  ctx.globalAlpha = 0.82
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.stroke()

  // Side face
  ctx.beginPath()
  ctx.moveTo(left + width, top)
  ctx.lineTo(left + width + depthOff, top - dy)
  ctx.lineTo(left + width + depthOff, top + height - dy)
  ctx.lineTo(left + width, top + height)
  ctx.closePath()
  ctx.globalAlpha = 0.55
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.stroke()
}
