import type { CutItem, LengthUnit, Project, ShopProfile, StockSheet } from '../types'
import { PART_ROLE_LABELS, isPartRoleAssigned } from '../types'
import { formatDim, formatSize } from '../domain/units'
import type { OptimizationResult, SheetLayout } from '../domain/optimizer'
import type { BandingBomLine } from '../domain/banding'
import { jsPDF } from 'jspdf'

export function exportCutListCsv(items: CutItem[], unit: LengthUnit): string {
  const header = [
    'Label',
    'Length',
    'Width',
    'Qty',
    'Material',
    'Rotate',
    'Grain',
    'Role',
    'EdgeBandTop',
    'EdgeBandBottom',
    'EdgeBandLeft',
    'EdgeBandRight',
  ]
  const rows = items.map((i) => [
    csvEscape(i.label),
    formatDim(i.lengthMm, unit),
    formatDim(i.widthMm, unit),
    String(i.quantity),
    csvEscape(i.materialType),
    i.canRotate ? 'yes' : 'no',
    i.grainLocked ? 'yes' : 'no',
    i.partRole,
    i.edgeBandTop ? 'yes' : 'no',
    i.edgeBandBottom ? 'yes' : 'no',
    i.edgeBandLeft ? 'yes' : 'no',
    i.edgeBandRight ? 'yes' : 'no',
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

function drawShopHeader(
  doc: jsPDF,
  shop: ShopProfile | null | undefined,
  projectName: string,
  margin: number,
  pageW: number,
): number {
  let y = margin + 4
  const shopName = shop?.shopName?.trim()
  let logoDrawn = false

  if (shop?.logoDataUrl) {
    try {
      doc.addImage(shop.logoDataUrl, 'JPEG', margin, margin, 28, 14)
      logoDrawn = true
      y = Math.max(y, margin + 16)
    } catch {
      try {
        doc.addImage(shop.logoDataUrl, 'PNG', margin, margin, 28, 14)
        logoDrawn = true
        y = Math.max(y, margin + 16)
      } catch {
        /* ignore bad logo */
      }
    }
  }

  const textX = logoDrawn ? margin + 32 : margin
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(62, 39, 35)
  doc.text(shopName || 'AnyCut', textX, margin + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(93, 64, 55)
  doc.text(projectName, textX, margin + 12)
  if (shop?.phone || shop?.address) {
    const contact = [shop.phone, shop.address].filter(Boolean).join(' · ')
    doc.setFontSize(8)
    doc.text(contact, textX, margin + 17, { maxWidth: pageW - textX - margin })
    y = Math.max(y, margin + 22)
  } else {
    y = Math.max(y, margin + 16)
  }
  return y + 4
}

export function exportLayoutPdf(
  project: Project,
  result: OptimizationResult,
  unit: LengthUnit,
  shop?: ShopProfile | null,
  bandingBom: BandingBomLine[] = [],
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 12

  result.sheets.forEach((sheet, idx) => {
    if (idx > 0) doc.addPage()
    const headerBottom = drawShopHeader(doc, shop, project.name, margin, pageW)
    if (idx === 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(60, 40, 30)
      doc.text(
        `${result.totalSheets} sheet(s) · ${result.totalParts} parts · Yield ${result.yieldPercent.toFixed(1)}% · Waste ${result.overallWastePercent.toFixed(1)}% · ${result.algorithmUsed}`,
        margin,
        headerBottom,
      )
      drawSheetPage(doc, sheet, unit, margin, pageW, pageH, headerBottom + 6)
    } else {
      drawSheetPage(doc, sheet, unit, margin, pageW, pageH, headerBottom + 2)
    }
  })

  if (bandingBom.length > 0) {
    doc.addPage('a4', 'portrait')
    const portraitW = doc.internal.pageSize.getWidth()
    const portraitH = doc.internal.pageSize.getHeight()
    let y = drawShopHeader(doc, shop, `${project.name} — Edge banding`, margin, portraitW)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30, 20, 15)
    doc.text('Edge banding legend', margin, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const total = bandingBom.reduce((s, l) => s + l.totalLengthMm, 0)
    doc.text(`Total: ${formatDim(total, unit)}`, margin, y)
    y += 8
    for (const line of bandingBom) {
      doc.text(
        `${line.materialType} · ${formatDim(line.segmentLengthMm, unit)} × ${line.segmentCount} = ${formatDim(line.totalLengthMm, unit)}`,
        margin,
        y,
      )
      y += 6
      if (y > portraitH - 20) {
        doc.addPage()
        y = margin + 10
      }
    }
  }

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
  doc.setTextColor(30, 20, 15)
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

export function exportPartLabelsPdf(
  project: Project,
  items: CutItem[],
  unit: LengthUnit,
  shop?: ShopProfile | null,
) {
  if (!items.length) throw new Error('Nothing to export')

  const pieces: Array<{
    index: number
    label: string
    lengthMm: number
    widthMm: number
    materialType: string
    grainLocked: boolean
    canRotate: boolean
    partRoleDisplay: string | null
  }> = []
  let n = 0
  for (const item of items) {
    const qty = Math.max(1, item.quantity)
    const role = isPartRoleAssigned(item.partRole) ? PART_ROLE_LABELS[item.partRole] : null
    for (let i = 0; i < qty; i++) {
      n++
      pieces.push({
        index: n,
        label: item.label || 'Part',
        lengthMm: item.lengthMm,
        widthMm: item.widthMm,
        materialType: item.materialType,
        grainLocked: item.grainLocked,
        canRotate: item.canRotate,
        partRoleDisplay: role,
      })
    }
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const cols = 2
  const rows = 4
  const perPage = cols * rows
  const marginX = 28
  const marginTop = 36
  const marginBottom = 28
  const gapX = 10
  const gapY = 10
  const headerBand = 28
  const gridTop = marginTop + headerBand
  const labelW = (pageWidth - 2 * marginX - gapX * (cols - 1)) / cols
  const labelH = (pageHeight - gridTop - marginBottom - gapY * (rows - 1)) / rows
  const totalPages = Math.ceil(pieces.length / perPage)

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage()
    doc.setFillColor(255, 251, 247)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')

    if (shop?.logoDataUrl) {
      try {
        doc.addImage(shop.logoDataUrl, 'JPEG', marginX, marginTop - 4, 36, 18)
      } catch {
        try {
          doc.addImage(shop.logoDataUrl, 'PNG', marginX, marginTop - 4, 36, 18)
        } catch {
          /* ignore */
        }
      }
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(62, 39, 35)
    const titlePrefix = shop?.shopName?.trim() ? `${shop.shopName} · ` : ''
    doc.text(
      `Part labels · ${titlePrefix}${project.name.slice(0, 36)}`,
      marginX + (shop?.logoDataUrl ? 42 : 0),
      marginTop + 8,
    )
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(141, 110, 99)
    doc.text(
      `Page ${page + 1}/${totalPages} · ${pieces.length} pcs · ${unit}`,
      pageWidth - marginX - 140,
      marginTop + 8,
    )

    for (let slot = 0; slot < perPage; slot++) {
      const idx = page * perPage + slot
      if (idx >= pieces.length) break
      const piece = pieces[idx]
      const col = slot % cols
      const row = Math.floor(slot / cols)
      const left = marginX + col * (labelW + gapX)
      const top = gridTop + row * (labelH + gapY)

      doc.setDrawColor(188, 170, 164)
      doc.setLineWidth(1)
      doc.roundedRect(left, top, labelW, labelH, 4, 4, 'S')

      const pad = 10
      let y = top + pad + 12
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(141, 110, 99)
      doc.text(`#${String(piece.index).padStart(2, '0')}`, left + labelW - pad - 18, y)

      doc.setFontSize(13)
      doc.setTextColor(28, 20, 16)
      doc.text(piece.label.slice(0, 28), left + pad, y)

      y += 18
      doc.setFont('courier', 'bold')
      doc.setFontSize(12)
      doc.text(formatSize(piece.lengthMm, piece.widthMm, unit), left + pad, y)

      y += 14
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(93, 64, 55)
      const meta = [
        piece.materialType,
        piece.grainLocked ? 'grain lock' : piece.canRotate ? 'rotate ok' : 'no rotate',
        piece.partRoleDisplay,
      ]
        .filter(Boolean)
        .join(' · ')
      doc.text(meta, left + pad, y, { maxWidth: labelW - pad * 2 })

      y += 12
      doc.setFontSize(8)
      doc.setTextColor(141, 110, 99)
      doc.text(project.name.slice(0, 40), left + pad, y)
    }
  }

  doc.save(`${slug(project.name)}-labels.pdf`)
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'project'
  )
}

export function stockSummaryCsv(sheets: StockSheet[], unit: LengthUnit): string {
  const header = ['Label', 'Size', 'Material', 'Available', 'PricePerSheet']
  const rows = sheets.map((s) => [
    csvEscape(s.label || 'Stock'),
    formatSize(s.lengthMm, s.widthMm, unit),
    csvEscape(s.materialType),
    s.availableQuantity <= 0 ? 'unlimited' : String(s.availableQuantity),
    String(s.pricePerSheet),
  ])
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
}
