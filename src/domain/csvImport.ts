import type { CutItem, LengthUnit, PartRole } from '../types'
import { createId, defaultCutItemFields, PART_ROLES } from '../types'
import { parseToMm } from './units'
import { classifyLabel } from './cabinetAssembly'

export interface CsvImportResult {
  items: CutItem[]
  errors: string[]
  skippedBlankRows: number
}

const BOOL_TRUE = new Set(['1', 'yes', 'true', 'y', 'on'])
const BOOL_FALSE = new Set(['0', 'no', 'false', 'n', 'off', ''])

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === '') return fallback
  const v = raw.trim().toLowerCase()
  if (BOOL_TRUE.has(v)) return true
  if (BOOL_FALSE.has(v)) return false
  return fallback
}

function detectSeparator(lines: string[]): string {
  const first = lines[0] ?? ''
  const commas = (first.match(/,/g) ?? []).length
  const semis = (first.match(/;/g) ?? []).length
  return semis > commas ? ';' : ','
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else inQuotes = !inQuotes
      continue
    }
    if (ch === sep && !inQuotes) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

type ColMap = Record<string, number>

function detectHeader(cells: string[]): ColMap | null {
  const lower = cells.map((c) => c.trim().toLowerCase())
  const hasLabel = lower.some((c) => c === 'label' || c === 'name' || c === 'part')
  const hasLen = lower.some((c) => c === 'length' || c === 'l' || c === 'len')
  const hasWid = lower.some((c) => c === 'width' || c === 'w' || c === 'wid')
  if (!hasLabel || !hasLen || !hasWid) return null

  const map: ColMap = {}
  lower.forEach((c, i) => {
    if (c === 'label' || c === 'name' || c === 'part') map.label = i
    else if (c === 'length' || c === 'l' || c === 'len') map.length = i
    else if (c === 'width' || c === 'w' || c === 'wid') map.width = i
    else if (c === 'qty' || c === 'quantity' || c === 'q') map.qty = i
    else if (c === 'material' || c === 'mat') map.material = i
    else if (c === 'grain' || c === 'grainlocked' || c === 'grain_locked') map.grain = i
    else if (c === 'rotate' || c === 'canrotate' || c === 'can_rotate') map.rotate = i
    else if (c === 'edgebandtop' || c === 'edge_band_top' || c === 'band_top') map.bandTop = i
    else if (c === 'edgebandbottom' || c === 'edge_band_bottom' || c === 'band_bottom')
      map.bandBottom = i
    else if (c === 'edgebandleft' || c === 'edge_band_left' || c === 'band_left') map.bandLeft = i
    else if (c === 'edgebandright' || c === 'edge_band_right' || c === 'band_right')
      map.bandRight = i
    else if (c === 'role' || c === 'partrole' || c === 'part_role') map.role = i
  })
  return map
}

function defaultColumnMap(size: number): ColMap {
  const map: ColMap = { label: 0, length: 1, width: 2 }
  if (size > 3) map.qty = 3
  if (size > 4) map.material = 4
  if (size > 5) map.grain = 5
  if (size > 6) map.rotate = 6
  return map
}

function parseRole(raw: string | undefined): PartRole {
  if (!raw?.trim()) return 'NONE'
  const u = raw.trim().toUpperCase().replace(/\s+/g, '_')
  if ((PART_ROLES as readonly string[]).includes(u)) return u as PartRole
  const fromLabel = classifyLabel(raw)
  return fromLabel === 'UNKNOWN' ? 'NONE' : fromLabel
}

export function parseCutListCsv(
  text: string,
  projectId: string,
  unit: LengthUnit,
): CsvImportResult {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)

  if (!lines.length) return { items: [], errors: ['File is empty'], skippedBlankRows: 0 }

  const sep = detectSeparator(lines)
  const rawRows = lines.map((l) => splitCsvLine(l, sep))
  const header = detectHeader(rawRows[0] ?? [])
  const columnMap = header ?? defaultColumnMap(rawRows[0]?.length ?? 0)
  const dataRows = header ? rawRows.slice(1) : rawRows
  const startLine = header ? 2 : 1

  const items: CutItem[] = []
  const errors: string[] = []
  let skippedBlankRows = 0

  dataRows.forEach((cells, idx) => {
    const lineNo = startLine + idx
    if (cells.every((c) => !c.trim())) {
      skippedBlankRows++
      return
    }
    const label = (cells[columnMap.label] ?? '').trim()
    const lengthRaw = cells[columnMap.length] ?? ''
    const widthRaw = cells[columnMap.width] ?? ''
    const lengthMm = parseToMm(lengthRaw, unit)
    const widthMm = parseToMm(widthRaw, unit)
    if (!label) {
      errors.push(`Row ${lineNo}: label is required`)
      return
    }
    if (lengthMm == null || widthMm == null || lengthMm <= 0 || widthMm <= 0) {
      errors.push(`Row ${lineNo}: invalid length/width`)
      return
    }
    const qtyRaw = columnMap.qty != null ? cells[columnMap.qty] : '1'
    const quantity = Math.max(1, Math.floor(Number(qtyRaw) || 1))
    const material =
      columnMap.material != null && cells[columnMap.material]?.trim()
        ? cells[columnMap.material].trim()
        : 'Plywood'
    const grainLocked = parseBool(
      columnMap.grain != null ? cells[columnMap.grain] : undefined,
      false,
    )
    const canRotate = grainLocked
      ? false
      : parseBool(columnMap.rotate != null ? cells[columnMap.rotate] : undefined, true)
    const defaults = defaultCutItemFields()
    const partRole =
      columnMap.role != null ? parseRole(cells[columnMap.role]) : classifyLabel(label)
    items.push({
      id: createId(),
      projectId,
      label,
      lengthMm,
      widthMm,
      quantity,
      materialType: material,
      canRotate,
      grainLocked,
      partRole: partRole === 'UNKNOWN' ? 'NONE' : partRole,
      edgeBandTop: parseBool(
        columnMap.bandTop != null ? cells[columnMap.bandTop] : undefined,
        defaults.edgeBandTop,
      ),
      edgeBandBottom: parseBool(
        columnMap.bandBottom != null ? cells[columnMap.bandBottom] : undefined,
        defaults.edgeBandBottom,
      ),
      edgeBandLeft: parseBool(
        columnMap.bandLeft != null ? cells[columnMap.bandLeft] : undefined,
        defaults.edgeBandLeft,
      ),
      edgeBandRight: parseBool(
        columnMap.bandRight != null ? cells[columnMap.bandRight] : undefined,
        defaults.edgeBandRight,
      ),
    })
  })

  return { items, errors, skippedBlankRows }
}

export const CSV_COLUMN_HINT =
  'Columns: label, length, width, qty [, material, grain, rotate, edgeBandTop, edgeBandBottom, edgeBandLeft, edgeBandRight, role]. Header optional. Separators , or ;.'
