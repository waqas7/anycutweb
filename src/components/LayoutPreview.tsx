import type { SheetLayout } from '../domain/optimizer'
import { formatCompact, formatSize } from '../domain/units'
import type { LengthUnit } from '../types'
import './LayoutPreview.css'

const FILL = [
  '#b48250',
  '#8c6446',
  '#c8965a',
  '#7a5a3c',
  '#a07855',
  '#6e4e36',
  '#d4a574',
]

interface Props {
  sheet: SheetLayout
  unit: LengthUnit
  highlightKey?: string | null
  onSelectPiece?: (key: string) => void
}

export function LayoutPreview({ sheet, unit, highlightKey, onSelectPiece }: Props) {
  const pad = 8
  const maxW = 640
  const scale = Math.min(maxW / sheet.sheetLength, 360 / sheet.sheetWidth)
  const w = sheet.sheetLength * scale
  const h = sheet.sheetWidth * scale
  const vbW = w + pad * 2
  const vbH = h + pad * 2

  return (
    <div className="layout-preview">
      <div className="layout-preview__meta">
        <strong>Sheet {sheet.sheetIndex}</strong>
        <span>{sheet.stockLabel}</span>
        <span>{formatSize(sheet.sheetLength, sheet.sheetWidth, unit)}</span>
        <span>Waste {sheet.wastePercent.toFixed(1)}%</span>
      </div>
      <svg
        className="layout-preview__svg"
        viewBox={`0 0 ${vbW} ${vbH}`}
        role="img"
        aria-label={`Nesting layout for sheet ${sheet.sheetIndex}`}
      >
        <rect
          x={pad}
          y={pad}
          width={w}
          height={h}
          className="layout-preview__sheet"
        />
        {sheet.pieces.map((p, i) => {
          const active = highlightKey === p.highlightKey
          const px = pad + p.x * scale
          const py = pad + p.y * scale
          const pw = Math.max(1, p.length * scale)
          const ph = Math.max(1, p.width * scale)
          const fontSize = Math.max(8, Math.min(12, Math.min(pw, ph) / 3.5))
          return (
            <g
              key={p.highlightKey}
              className={active ? 'layout-preview__piece is-active' : 'layout-preview__piece'}
              onClick={() => onSelectPiece?.(p.highlightKey)}
              style={{ cursor: onSelectPiece ? 'pointer' : 'default' }}
            >
              <rect
                x={px}
                y={py}
                width={pw}
                height={ph}
                fill={FILL[i % FILL.length]}
                stroke={active ? '#1c1410' : '#3e2723'}
                strokeWidth={active ? 2.5 : 1}
              />
              <text
                x={px + pw / 2}
                y={py + ph / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fill="#1c1410"
              >
                {pw > 28 && ph > 16
                  ? `#${p.cutNumber}`
                  : String(p.cutNumber)}
              </text>
              {pw > 56 && ph > 28 && (
                <text
                  x={px + pw / 2}
                  y={py + ph / 2 + fontSize}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.max(7, fontSize - 2)}
                  fill="#1c1410"
                  opacity={0.85}
                >
                  {truncate(p.label, Math.floor(pw / 6))}
                </text>
              )}
            </g>
          )
        })}
        <text x={pad + 4} y={pad + h + 2} fontSize={9} fill="#5d4037" dominantBaseline="hanging">
          0,{formatCompact(sheet.sheetWidth, unit)} → {formatCompact(sheet.sheetLength, unit)},0
        </text>
      </svg>
      <ul className="layout-preview__legend">
        {sheet.pieces.map((p, i) => (
          <li key={p.highlightKey}>
            <span className="swatch" style={{ background: FILL[i % FILL.length] }} />
            #{p.cutNumber} {p.label}
            {p.rotated ? ' (rot)' : ''} — {formatSize(p.length, p.width, unit)}
          </li>
        ))}
      </ul>
    </div>
  )
}

function truncate(s: string, max: number): string {
  if (max < 3) return ''
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`
}
