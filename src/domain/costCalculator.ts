import type { LengthUnit, Project, StockSheet } from '../types'
import { fromMm } from './units'
import type { OptimizationResult } from './optimizer'

export interface SheetCostLine {
  stockLabel: string
  materialType: string
  sheetsUsed: number
  pricePerSheet: number
  lineTotal: number
}

export interface CostSummary {
  sheetLines: SheetCostLine[]
  sheetCost: number
  sheetsOpened: number
  partsCut: number
  bandingTotalMm: number
  bandingPricePerUnit: number
  bandingCost: number
  currencySymbol: string
  total: number
  hasAnyRate: boolean
}

export function computeJobCost(
  result: OptimizationResult | null,
  stock: StockSheet[],
  project: Project,
  unit: LengthUnit,
  bandingTotalMmFallback = 0,
  partsFallback = 0,
): CostSummary {
  const priceById = new Map(stock.map((s) => [s.id, s.pricePerSheet]))
  const usage = new Map<string, { label: string; material: string; count: number }>()
  if (result) {
    for (const sheet of result.sheets) {
      const prev = usage.get(sheet.stockId)
      if (prev) prev.count += 1
      else
        usage.set(sheet.stockId, {
          label: sheet.stockLabel,
          material: sheet.materialType,
          count: 1,
        })
    }
  }

  const sheetLines: SheetCostLine[] = [...usage.entries()].map(([id, u]) => {
    const price = priceById.get(id) ?? 0
    return {
      stockLabel: u.label,
      materialType: u.material,
      sheetsUsed: u.count,
      pricePerSheet: price,
      lineTotal: u.count * price,
    }
  })

  const sheetCost = sheetLines.reduce((s, l) => s + l.lineTotal, 0)
  const sheetsOpened = result?.totalSheets ?? 0
  const partsCut = result?.totalParts ?? partsFallback
  const bandingTotalMm = bandingTotalMmFallback
  const bandingRate = project.bandingPricePerUnit
  const bandingQty = fromMm(bandingTotalMm, unit)
  const bandingCost = bandingQty * bandingRate
  const currencySymbol = project.currencySymbol.trim()

  return {
    sheetLines,
    sheetCost,
    sheetsOpened,
    partsCut,
    bandingTotalMm,
    bandingPricePerUnit: bandingRate,
    bandingCost,
    currencySymbol,
    total: sheetCost + bandingCost,
    hasAnyRate: bandingRate > 0 || sheetLines.some((l) => l.pricePerSheet > 0),
  }
}

export function formatMoney(amount: number, currency: string): string {
  const num =
    amount === Math.round(amount) ? String(Math.round(amount)) : amount.toFixed(2)
  return currency ? `${currency} ${num}` : num
}
