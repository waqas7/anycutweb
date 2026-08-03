import type { CutItem, LengthUnit, Project, StockSheet } from '../types'
import { formatDim, formatSize } from '../domain/units'
import type { OptimizationResult, SheetLayout } from '../domain/optimizer'
import { jsPDF } from 'jspdf'

export function exportCutListCsv(items: CutItem[], unit: LengthUnit): string {
  const header = ['Label', 'Length', 'Width', 'Qty', 'Material', 'Rotate']
  const rows = items.map((i) => [
    csvEscape(i.label),
    formatDim(i.lengthMm, unit),
    formatDim(i.widthMm, unit),
    String(i.quantity),
    csvEscape(i.materialType),
    i.grainLocked ? 'grain-locked' : i.canRotate ? 'yes' : 'no',
  ])
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

export function exportLayoutCsv(result: OptimizationResult, unit: LengthUnit): string {
  const header = [
    'Sheet',
    'Stock',
    'Cut#',
    'Label',
    'X',
    'Y',
    'Length',
    'Width',
    'Rotated',
  ]
  const rows: string[][] = []
  for (const sheet of result.sheets) {
    for (const p of sheet.pieces) {
      rows.push([
        String(sheet.sheetIndex),
        csvEscape(sheet.stockLabel),
        String(p.cutNumber),
        csvEscape(p.label),
        formatDim(p.x, unit),
        formatDim(p.y, unit),
        formatDim(p.length, unit),
        formatDim(p.width, unit),
        p.rotated ? 'yes' : 'no',
      ])
    }
  }
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

export function downloadText(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function exportLayoutPdf(
  project: Project,
  result: OptimizationResult,
  unit: LengthUnit,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 12

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(`AnyCut — ${project.name}`, margin, margin + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(
    `${result.totalSheets} sheet(s) · ${result.totalParts} parts · Yield ${result.yieldPercent.toFixed(1)}% · Waste ${result.overallWastePercent.toFixed(1)}% · ${result.algorithmUsed}`,
    margin,
    margin + 11,
  )

  result.sheets.forEach((sheet, idx) => {
    if (idx > 0) doc.addPage()
    if (idx > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(`AnyCut — ${project.name}`, margin, margin + 4)
    }
    drawSheetPage(doc, sheet, unit, margin, pageW, pageH, idx === 0 ? margin + 18 : margin + 12)
  })

  doc.save(`${slug(project.name)}-layout.pdf`)
}

function drawSheetPage(
  doc: jsPDF,
  sheet: SheetLayout,
  unit: LengthUnit,
  margin: number,
  pageW: number,
  pageH: number,
  top: number,
) {
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(
    `Sheet ${sheet.sheetIndex} — ${sheet.stockLabel} (${formatSize(sheet.sheetLength, sheet.sheetWidth, unit)}) · Waste ${sheet.wastePercent.toFixed(1)}%`,
    margin,
    top,
  )

  const availW = pageW - margin * 2
  const availH = pageH - top - 20
  const scale = Math.min(availW / sheet.sheetLength, availH / sheet.sheetWidth)
  const drawW = sheet.sheetLength * scale
  const drawH = sheet.sheetWidth * scale
  const ox = margin + (availW - drawW) / 2
  const oy = top + 8

  doc.setDrawColor(60, 40, 30)
  doc.setFillColor(250, 247, 242)
  doc.rect(ox, oy, drawW, drawH, 'FD')

  const colors = [
    [180, 130, 80],
    [140, 100, 70],
    [200, 150, 90],
    [120, 90, 60],
    [160, 120, 85],
  ]

  sheet.pieces.forEach((p, i) => {
    const c = colors[i % colors.length]
    doc.setFillColor(c[0], c[1], c[2])
    doc.setDrawColor(50, 30, 20)
    const x = ox + p.x * scale
    const y = oy + p.y * scale
    const w = p.length * scale
    const h = p.width * scale
    doc.rect(x, y, w, h, 'FD')
    doc.setFontSize(Math.max(5, Math.min(8, w / 4)))
    doc.setTextColor(30, 20, 15)
    const label = `#${p.cutNumber} ${p.label}`
    doc.text(label, x + 1.5, y + Math.min(h - 1, 4), { maxWidth: w - 3 })
  })
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'project'
}

export function stockSummaryCsv(sheets: StockSheet[], unit: LengthUnit): string {
  const header = ['Label', 'Size', 'Material', 'Available']
  const rows = sheets.map((s) => [
    csvEscape(s.label || 'Stock'),
    formatSize(s.lengthMm, s.widthMm, unit),
    csvEscape(s.materialType),
    s.availableQuantity <= 0 ? 'unlimited' : String(s.availableQuantity),
  ])
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
}
