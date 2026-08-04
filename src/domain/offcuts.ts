import type { OptimizationResult } from './optimizer'

export interface OffcutCandidate {
  lengthMm: number
  widthMm: number
  materialType: string
  fromSheetIndex: number
  stockLabel: string
  areaMm2: number
}

const MIN_SIDE_MM = 100
const MIN_AREA_MM2 = MIN_SIDE_MM * MIN_SIDE_MM
const EPS = 1e-6

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function extractOffcuts(result: OptimizationResult): OffcutCandidate[] {
  const out: OffcutCandidate[] = []
  for (const sheet of result.sheets) {
    let free: Rect[] = [{ x: 0, y: 0, w: sheet.sheetLength, h: sheet.sheetWidth }]
    for (const piece of sheet.pieces) {
      free = subtract(free, { x: piece.x, y: piece.y, w: piece.length, h: piece.width })
    }
    for (const r of free) {
      if (r.w >= MIN_SIDE_MM && r.h >= MIN_SIDE_MM && r.w * r.h >= MIN_AREA_MM2) {
        out.push({
          lengthMm: r.w,
          widthMm: r.h,
          materialType: sheet.materialType || 'Other',
          fromSheetIndex: sheet.sheetIndex,
          stockLabel: sheet.stockLabel,
          areaMm2: r.w * r.h,
        })
      }
    }
  }
  return out.sort((a, b) => b.areaMm2 - a.areaMm2)
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.h - EPS && a.y + a.h > b.y + EPS
}

function subtract(free: Rect[], used: Rect): Rect[] {
  const next: Rect[] = []
  for (const f of free) {
    if (!intersects(f, used)) {
      next.push(f)
      continue
    }
    if (used.x > f.x + EPS) next.push({ x: f.x, y: f.y, w: used.x - f.x, h: f.h })
    if (used.x + used.w < f.x + f.w - EPS)
      next.push({
        x: used.x + used.w,
        y: f.y,
        w: f.x + f.w - (used.x + used.w),
        h: f.h,
      })
    if (used.y > f.y + EPS) next.push({ x: f.x, y: f.y, w: f.w, h: used.y - f.y })
    if (used.y + used.h < f.y + f.h - EPS)
      next.push({
        x: f.x,
        y: used.y + used.h,
        w: f.w,
        h: f.y + f.h - (used.y + used.h),
      })
  }
  return next
}
