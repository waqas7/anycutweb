import type { CutItem, StockSheet } from '../types'

const EPS = 1e-6
const ANY_MATERIAL = '*'

export interface StockSpec {
  id: string
  label: string
  lengthMm: number
  widthMm: number
  materialType: string
  availableQuantity: number
}

export interface PlacedPiece {
  label: string
  materialType: string
  x: number
  y: number
  length: number
  width: number
  rotated: boolean
  cutNumber: number
  highlightKey: string
}

export interface SheetLayout {
  sheetIndex: number
  sheetLength: number
  sheetWidth: number
  pieces: PlacedPiece[]
  usedArea: number
  wastePercent: number
  materialType: string
  stockLabel: string
  stockId: string
}

export interface OptimizationResult {
  sheets: SheetLayout[]
  totalSheets: number
  overallWastePercent: number
  totalPieceArea: number
  totalSheetArea: number
  unplaced: string[]
  algorithmUsed: string
  totalParts: number
  yieldPercent: number
}

interface WorkingPiece {
  id: string
  label: string
  materialType: string
  length: number
  width: number
  canRotate: boolean
  highlightKey: string
  area: number
  maxSide: number
}

type Heuristic = 'BSSF' | 'BAF' | 'BL'

interface FreeRect {
  x: number
  y: number
  width: number
  height: number
}

interface ScoredPlacement {
  piece: WorkingPiece
  x: number
  y: number
  packW: number
  packH: number
  finishedW: number
  finishedH: number
  rotated: boolean
  primary: number
  secondary: number
}

function accepts(stock: StockSpec, pieceMaterial: string): boolean {
  return (
    stock.materialType === ANY_MATERIAL ||
    stock.materialType.toLowerCase() === pieceMaterial.toLowerCase()
  )
}

function hasCapacity(stock: StockSpec, opened: number): boolean {
  return stock.availableQuantity <= 0 || opened < stock.availableQuantity
}

function expandPieces(items: CutItem[]): WorkingPiece[] {
  return items.flatMap((item) => {
    const qty = Math.max(1, item.quantity)
    return Array.from({ length: qty }, (_, index) => {
      const length = item.lengthMm
      const width = item.widthMm
      return {
        id: `${item.id}-${index}`,
        label: qty > 1 ? `${item.label} #${index + 1}` : item.label,
        materialType: item.materialType,
        length,
        width,
        canRotate: !item.grainLocked && item.canRotate,
        highlightKey: `${item.id}-${index}`,
        area: length * width,
        maxSide: Math.max(length, width),
      }
    })
  })
}

function stockFromSheets(sheets: StockSheet[]): StockSpec[] {
  return sheets.map((s) => ({
    id: s.id,
    label: s.label || `${s.materialType} ${Math.round(s.lengthMm)}×${Math.round(s.widthMm)}`,
    lengthMm: s.lengthMm,
    widthMm: s.widthMm,
    materialType: s.materialType,
    availableQuantity: s.availableQuantity,
  }))
}

class SheetState {
  placed: PlacedPiece[] = []
  private free: FreeRect[]
  private readonly canvasW: number
  private readonly canvasH: number
  private readonly sheetLength: number
  private readonly sheetWidth: number
  private readonly kerf: number

  constructor(sheetLength: number, sheetWidth: number, kerf: number) {
    this.sheetLength = sheetLength
    this.sheetWidth = sheetWidth
    this.kerf = kerf
    this.canvasW = sheetLength + kerf
    this.canvasH = sheetWidth + kerf
    this.free = [{ x: 0, y: 0, width: this.canvasW, height: this.canvasH }]
  }

  findBestPlacement(piece: WorkingPiece, heuristic: Heuristic): ScoredPlacement | null {
    let best: ScoredPlacement | null = null
    for (const [finishedW, finishedH, rotated] of orientations(piece)) {
      if (finishedW > this.sheetLength + EPS || finishedH > this.sheetWidth + EPS) continue
      const packW = finishedW + this.kerf
      const packH = finishedH + this.kerf
      for (const rect of this.free) {
        if (packW > rect.width + EPS || packH > rect.height + EPS) continue
        if (rect.x + finishedW > this.sheetLength + EPS) continue
        if (rect.y + finishedH > this.sheetWidth + EPS) continue
        const [primary, secondary] = score(rect, packW, packH, heuristic)
        const candidate: ScoredPlacement = {
          piece,
          x: rect.x,
          y: rect.y,
          packW,
          packH,
          finishedW,
          finishedH,
          rotated,
          primary,
          secondary,
        }
        if (!best || betterThan(candidate, best)) best = candidate
      }
    }
    return best
  }

  commit(placement: ScoredPlacement) {
    this.placed.push({
      label: placement.piece.label,
      materialType: placement.piece.materialType,
      x: placement.x,
      y: placement.y,
      length: placement.finishedW,
      width: placement.finishedH,
      rotated: placement.rotated,
      cutNumber: 0,
      highlightKey: placement.piece.highlightKey,
    })
    const used: FreeRect = {
      x: placement.x,
      y: placement.y,
      width: placement.packW,
      height: placement.packH,
    }
    const next: FreeRect[] = []
    for (const rect of this.free) {
      if (!splitFreeNode(rect, used, next)) next.push(rect)
    }
    this.free = pruneContained(next)
  }
}

function orientations(piece: WorkingPiece): Array<[number, number, boolean]> {
  const list: Array<[number, number, boolean]> = [[piece.length, piece.width, false]]
  if (piece.canRotate && Math.abs(piece.length - piece.width) > EPS) {
    list.push([piece.width, piece.length, true])
  }
  return list
}

function score(
  rect: FreeRect,
  packW: number,
  packH: number,
  heuristic: Heuristic,
): [number, number] {
  const leftoverX = rect.width - packW
  const leftoverY = rect.height - packH
  switch (heuristic) {
    case 'BSSF':
      return [Math.min(leftoverX, leftoverY), Math.max(leftoverX, leftoverY)]
    case 'BAF':
      return [rect.width * rect.height - packW * packH, Math.min(leftoverX, leftoverY)]
    case 'BL':
      return [rect.y, rect.x]
  }
}

function betterThan(a: ScoredPlacement, b: ScoredPlacement): boolean {
  if (a.primary < b.primary - EPS) return true
  if (a.primary > b.primary + EPS) return false
  return a.secondary < b.secondary - EPS
}

function splitFreeNode(free: FreeRect, used: FreeRect, out: FreeRect[]): boolean {
  if (
    used.x >= free.x + free.width - EPS ||
    used.x + used.width <= free.x + EPS ||
    used.y >= free.y + free.height - EPS ||
    used.y + used.height <= free.y + EPS
  ) {
    return false
  }
  if (used.x > free.x + EPS && used.x < free.x + free.width - EPS) {
    out.push({ x: free.x, y: free.y, width: used.x - free.x, height: free.height })
  }
  if (used.x + used.width < free.x + free.width - EPS) {
    out.push({
      x: used.x + used.width,
      y: free.y,
      width: free.x + free.width - (used.x + used.width),
      height: free.height,
    })
  }
  if (used.y > free.y + EPS && used.y < free.y + free.height - EPS) {
    out.push({ x: free.x, y: free.y, width: free.width, height: used.y - free.y })
  }
  if (used.y + used.height < free.y + free.height - EPS) {
    out.push({
      x: free.x,
      y: used.y + used.height,
      width: free.width,
      height: free.y + free.height - (used.y + used.height),
    })
  }
  return true
}

function pruneContained(rects: FreeRect[]): FreeRect[] {
  const result: FreeRect[] = []
  for (let i = 0; i < rects.length; i++) {
    const a = rects[i]
    if (a.width <= EPS || a.height <= EPS) continue
    let contained = false
    for (let j = 0; j < rects.length; j++) {
      if (i === j) continue
      const b = rects[j]
      if (
        a.x >= b.x - EPS &&
        a.y >= b.y - EPS &&
        a.x + a.width <= b.x + b.width + EPS &&
        a.y + a.height <= b.y + b.height + EPS
      ) {
        contained = true
        break
      }
    }
    if (!contained) result.push(a)
  }
  return result
}

function pieceFitsStock(piece: WorkingPiece, stock: StockSpec): boolean {
  const normal = piece.length <= stock.lengthMm + EPS && piece.width <= stock.widthMm + EPS
  const rotated =
    piece.canRotate &&
    piece.width <= stock.lengthMm + EPS &&
    piece.length <= stock.widthMm + EPS
  return normal || rotated
}

interface OpenSheet {
  stock: StockSpec
  state: SheetState
}

function placeBestFit(
  piece: WorkingPiece,
  matchingStock: StockSpec[],
  openSheets: OpenSheet[],
  openedCount: Map<string, number>,
  kerf: number,
  heuristic: Heuristic,
): boolean {
  let bestOpen: OpenSheet | null = null
  let bestPlacement: ScoredPlacement | null = null

  for (const open of openSheets) {
    if (!accepts(open.stock, piece.materialType)) continue
    const candidate = open.state.findBestPlacement(piece, heuristic)
    if (!candidate) continue
    if (!bestPlacement || betterThan(candidate, bestPlacement)) {
      bestPlacement = candidate
      bestOpen = open
    }
  }

  let bestNewSku: StockSpec | null = null
  let bestNewPlacement: ScoredPlacement | null = null
  let bestNewState: SheetState | null = null

  for (const sku of matchingStock) {
    const used = openedCount.get(sku.id) ?? 0
    if (!hasCapacity(sku, used)) continue
    if (!pieceFitsStock(piece, sku)) continue
    const probe = new SheetState(sku.lengthMm, sku.widthMm, kerf)
    const candidate = probe.findBestPlacement(piece, heuristic)
    if (!candidate) continue
    const better =
      !bestNewPlacement ||
      betterThan(candidate, bestNewPlacement) ||
      (!betterThan(bestNewPlacement, candidate) &&
        sku.lengthMm * sku.widthMm <
          (bestNewSku?.lengthMm ?? Infinity) * (bestNewSku?.widthMm ?? Infinity))
    if (better) {
      bestNewPlacement = candidate
      bestNewSku = sku
      bestNewState = probe
    }
  }

  const useExisting =
    bestOpen &&
    bestPlacement &&
    (!bestNewPlacement || betterThan(bestPlacement, bestNewPlacement))

  if (useExisting && bestOpen && bestPlacement) {
    bestOpen.state.commit(bestPlacement)
    return true
  }
  if (bestNewSku && bestNewState && bestNewPlacement) {
    bestNewState.commit(bestNewPlacement)
    openSheets.push({ stock: bestNewSku, state: bestNewState })
    openedCount.set(bestNewSku.id, (openedCount.get(bestNewSku.id) ?? 0) + 1)
    return true
  }
  return false
}

function pack(
  pieces: WorkingPiece[],
  stock: StockSpec[],
  kerf: number,
  heuristic: Heuristic,
): { sheets: OpenSheet[]; unplaced: string[]; label: string } {
  const openSheets: OpenSheet[] = []
  const openedCount = new Map<string, number>()
  const unplaced: string[] = []

  for (const piece of pieces) {
    const matching = stock.filter((s) => accepts(s, piece.materialType))
    if (matching.length === 0) {
      unplaced.push(`${piece.label} (no ${piece.materialType} stock)`)
      continue
    }
    if (!placeBestFit(piece, matching, openSheets, openedCount, kerf, heuristic)) {
      unplaced.push(piece.label)
    }
  }

  return {
    sheets: openSheets,
    unplaced,
    label: `MaxRects/${heuristic}/BestFit`,
  }
}

function beats(
  a: { sheets: OpenSheet[]; unplaced: string[] },
  b: { sheets: OpenSheet[]; unplaced: string[] },
): boolean {
  if (a.unplaced.length !== b.unplaced.length) return a.unplaced.length < b.unplaced.length
  if (a.sheets.length !== b.sheets.length) return a.sheets.length < b.sheets.length
  const usedA = a.sheets.reduce(
    (sum, s) => sum + s.state.placed.reduce((p, x) => p + x.length * x.width, 0),
    0,
  )
  const usedB = b.sheets.reduce(
    (sum, s) => sum + s.state.placed.reduce((p, x) => p + x.length * x.width, 0),
    0,
  )
  return usedA > usedB + 1e-9
}

function sortVariants(pieces: WorkingPiece[]): WorkingPiece[][] {
  const byArea = [...pieces].sort((a, b) => b.area - a.area || b.maxSide - a.maxSide)
  const byMax = [...pieces].sort((a, b) => b.maxSide - a.maxSide || b.area - a.area)
  const byW = [...pieces].sort((a, b) => b.length - a.length || b.width - a.width)
  return [byArea, byMax, byW]
}

export function optimize(
  items: CutItem[],
  stockSheets: StockSheet[],
  kerfMm = 3,
): OptimizationResult {
  if (kerfMm < 0) throw new Error('Kerf must be non-negative')
  const stock = stockFromSheets(stockSheets)
  if (stock.length === 0) throw new Error('At least one stock sheet is required')

  const pieces = expandPieces(items)
  if (pieces.length === 0) {
    return {
      sheets: [],
      totalSheets: 0,
      overallWastePercent: 0,
      totalPieceArea: 0,
      totalSheetArea: 0,
      unplaced: [],
      algorithmUsed: 'MaxRects',
      totalParts: 0,
      yieldPercent: 100,
    }
  }

  const heuristics: Heuristic[] = ['BSSF', 'BAF', 'BL']
  let best: ReturnType<typeof pack> | null = null

  for (const ordered of sortVariants(pieces)) {
    for (const h of heuristics) {
      const outcome = pack(ordered, stock, kerfMm, h)
      if (!best || beats(outcome, best)) best = outcome
    }
  }

  const packed = best!
  let cutNumber = 1
  const layouts: SheetLayout[] = packed.sheets.map((open, index) => {
    const piecesNumbered = open.state.placed.map((p) => ({
      ...p,
      cutNumber: cutNumber++,
    }))
    const sheetArea = open.stock.lengthMm * open.stock.widthMm
    const used = piecesNumbered.reduce((s, p) => s + p.length * p.width, 0)
    const waste = sheetArea <= 0 ? 0 : ((sheetArea - used) / sheetArea) * 100
    return {
      sheetIndex: index + 1,
      sheetLength: open.stock.lengthMm,
      sheetWidth: open.stock.widthMm,
      pieces: piecesNumbered,
      usedArea: used,
      wastePercent: Math.min(100, Math.max(0, waste)),
      materialType:
        open.stock.materialType === ANY_MATERIAL
          ? (piecesNumbered[0]?.materialType ?? '')
          : open.stock.materialType,
      stockLabel: open.stock.label,
      stockId: open.stock.id,
    }
  })

  const totalPieceArea = layouts.reduce((s, l) => s + l.usedArea, 0)
  const totalSheetArea = layouts.reduce((s, l) => s + l.sheetLength * l.sheetWidth, 0)
  const overallWaste =
    totalSheetArea <= 0 ? 0 : ((totalSheetArea - totalPieceArea) / totalSheetArea) * 100

  return {
    sheets: layouts,
    totalSheets: layouts.length,
    overallWastePercent: Math.min(100, Math.max(0, overallWaste)),
    totalPieceArea,
    totalSheetArea,
    unplaced: packed.unplaced,
    algorithmUsed: packed.label,
    totalParts: layouts.reduce((s, l) => s + l.pieces.length, 0),
    yieldPercent: Math.min(100, Math.max(0, 100 - overallWaste)),
  }
}
