import type { CutItem } from '../types'
import { bandingSegments } from '../types'

export interface BandingBomLine {
  materialType: string
  segmentLengthMm: number
  segmentCount: number
  totalLengthMm: number
}

export function computeBandingBom(items: CutItem[]): BandingBomLine[] {
  const counts = new Map<string, { material: string; length: number; count: number }>()
  for (const item of items) {
    const qty = Math.max(1, item.quantity)
    for (const seg of bandingSegments(item)) {
      const key = `${item.materialType}|${seg.lengthMm}`
      const prev = counts.get(key)
      if (prev) prev.count += qty
      else counts.set(key, { material: item.materialType, length: seg.lengthMm, count: qty })
    }
  }
  return [...counts.values()]
    .map((v) => ({
      materialType: v.material,
      segmentLengthMm: v.length,
      segmentCount: v.count,
      totalLengthMm: v.length * v.count,
    }))
    .sort((a, b) =>
      a.materialType === b.materialType
        ? b.segmentLengthMm - a.segmentLengthMm
        : a.materialType.localeCompare(b.materialType),
    )
}

export function bandingTotalMm(items: CutItem[]): number {
  return computeBandingBom(items).reduce((s, l) => s + l.totalLengthMm, 0)
}
