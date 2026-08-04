import type { CutItem, PartRole } from '../types'
import { isPartRoleAssigned } from '../types'

export interface IsoPanel {
  label: string
  localX: number
  localY: number
  widthFrac: number
  heightFrac: number
  explodeX: number
  explodeY: number
  depthScale: number
  isDoor: boolean
  isBack: boolean
  sizeCaption: string | null
}

export interface AssemblyResult {
  panels: IsoPanel[]
  outerWidthMm: number | null
  outerHeightMm: number | null
  outerDepthMm: number | null
  unmappedLabels: string[]
  isTemplateStructured: boolean
}

export function looksLikeTemplateCarcass(items: CutItem[]): boolean {
  if (items.length === 0) return false
  const roles = expandByQuantity(items).map(classify)
  const sideCount = roles.filter((r) => r === 'LEFT_SIDE' || r === 'RIGHT_SIDE').length
  const carcassPlanes = (['TOP', 'BOTTOM', 'BACK'] as PartRole[]).filter((plane) =>
    roles.includes(plane),
  ).length
  return sideCount >= 2 && carcassPlanes >= 2
}

export function classify(item: CutItem): PartRole {
  if (isPartRoleAssigned(item.partRole)) return item.partRole
  return classifyLabel(item.label)
}

export function classifyLabel(label: string): PartRole {
  const n = label.trim().toLowerCase()
  if (!n) return 'UNKNOWN'
  if (n.includes('false') && (n.includes('drawer') || n.includes('front'))) return 'FALSE_DRAWER'
  if (n.includes('drawer') && n.includes('bottom')) return 'DRAWER_BOTTOM'
  if (n.includes('drawer') && n.includes('side')) return 'DRAWER_SIDE'
  if (n.includes('drawer') && n.includes('back')) return 'DRAWER_BACK'
  if (n.includes('drawer') && n.includes('front')) return 'DRAWER_FRONT'
  if (n.includes('drawer')) return 'DRAWER_FRONT'
  if (n.includes('toe') || n.includes('plinth')) return 'TOE_KICK'
  if (n.includes('partition') || n.includes('upright')) return 'PARTITION'
  if (n.includes('rail')) return 'RAIL'
  if (n.includes('left') && n.includes('side')) return 'LEFT_SIDE'
  if (n.includes('right') && n.includes('side')) return 'RIGHT_SIDE'
  if (n === 'side' || n === 'sides' || (n.includes('side') && !n.includes('door'))) {
    return 'LEFT_SIDE'
  }
  if (n.includes('bottom')) return 'BOTTOM'
  if (n.includes('top') && !n.includes('stop')) return 'TOP'
  if (n.includes('back')) return 'BACK'
  if (n.includes('shelf') || n.includes('shelves')) return 'SHELF'
  if (n.includes('door') || n.includes('flap')) return 'DOOR'
  if (n.includes('end') || n.includes('gable')) return 'LEFT_SIDE'
  return 'UNKNOWN'
}

export function buildCabinetAssembly(items: CutItem[]): AssemblyResult {
  if (items.length === 0) {
    return {
      panels: [],
      outerWidthMm: null,
      outerHeightMm: null,
      outerDepthMm: null,
      unmappedLabels: [],
      isTemplateStructured: false,
    }
  }

  const expanded = expandByQuantity(items)
  const classified = expanded.map((it) => [it, classify(it)] as const)
  const templateStructured = looksLikeTemplateCarcass(items)
  const skipIn3d = new Set<PartRole>([
    'NONE',
    'UNKNOWN',
    'DRAWER_BOTTOM',
    'DRAWER_SIDE',
    'DRAWER_BACK',
  ])
  const unmapped = [
    ...new Set(
      classified.filter(([, role]) => skipIn3d.has(role)).map(([item]) => item.label),
    ),
  ]

  const sides = classified.filter(([, r]) => r === 'LEFT_SIDE' || r === 'RIGHT_SIDE')
  const tops = classified.filter(([, r]) => r === 'TOP')
  const bottoms = classified.filter(([, r]) => r === 'BOTTOM')
  const backs = classified.filter(([, r]) => r === 'BACK')
  const shelves = classified.filter(([, r]) => r === 'SHELF').map(([i]) => i)
  const doors = classified.filter(([, r]) => r === 'DOOR').map(([i]) => i)
  const drawerFronts = classified.filter(([, r]) => r === 'DRAWER_FRONT').map(([i]) => i)
  const falseDrawers = classified.filter(([, r]) => r === 'FALSE_DRAWER').map(([i]) => i)
  const rails = classified.filter(([, r]) => r === 'RAIL').map(([i]) => i)
  const toeKicks = classified.filter(([, r]) => r === 'TOE_KICK').map(([i]) => i)
  const partitions = classified.filter(([, r]) => r === 'PARTITION').map(([i]) => i)

  const leftSides = classified.filter(([, r]) => r === 'LEFT_SIDE').map(([i]) => i)
  const rightSides = classified.filter(([, r]) => r === 'RIGHT_SIDE').map(([i]) => i)

  let sideItems: Array<[CutItem, boolean]> = []
  if (leftSides.length > 0 || rightSides.length > 0) {
    const left = leftSides[0] ?? rightSides[0]
    const right = rightSides[0] ?? leftSides[1] ?? leftSides[0]
    if (left) sideItems.push([left, true])
    if (right) sideItems.push([right, false])
  } else {
    const generic = sides.map(([i]) => i)
    if (generic.length === 1) {
      sideItems = [
        [generic[0], true],
        [generic[0], false],
      ]
    } else if (generic.length >= 2) {
      sideItems = [
        [generic[0], true],
        [generic[1], false],
      ]
    }
  }

  const heightMm =
    sideItems[0]?.[0].lengthMm ??
    maxOf(doors.map((d) => Math.max(d.lengthMm, d.widthMm))) ??
    maxOf(shelves.map((s) => s.widthMm))
  const depthMm =
    sideItems[0]?.[0].widthMm ?? tops[0]?.[0].widthMm ?? bottoms[0]?.[0].widthMm ?? null
  const innerW =
    tops[0]?.[0].lengthMm ??
    bottoms[0]?.[0].lengthMm ??
    backs[0]?.[0].lengthMm ??
    shelves[0]?.lengthMm ??
    null

  const thicknessMm = estimateThickness(heightMm, backs[0]?.[0], sideItems[0]?.[0]) ?? 18

  let outerW: number | null = null
  if (innerW != null) outerW = innerW + 2 * thicknessMm
  else if (doors.length >= 2)
    outerW = doors.slice(0, 2).reduce((s, d) => s + Math.min(d.lengthMm, d.widthMm), 0) + 6
  else if (doors.length === 1) outerW = Math.max(doors[0].lengthMm, doors[0].widthMm) + 4
  else if (drawerFronts.length > 0)
    outerW =
      Math.max(...drawerFronts.map((d) => Math.max(d.lengthMm, d.widthMm))) + 4
  else outerW = innerW

  const outerH = heightMm ?? null
  const outerD = depthMm

  const hasCarcass =
    sideItems.length > 0 || tops.length > 0 || bottoms.length > 0 || backs.length > 0
  if (!hasCarcass && doors.length === 0 && shelves.length === 0 && drawerFronts.length === 0) {
    return {
      panels: [],
      outerWidthMm: outerW,
      outerHeightMm: outerH,
      outerDepthMm: outerD,
      unmappedLabels: unmapped,
      isTemplateStructured: templateStructured,
    }
  }

  const t = thicknessFraction(outerW, outerH, thicknessMm)
  const open = Math.max(0.5, 1 - 2 * t)
  const panels: IsoPanel[] = []

  const caption = (item: CutItem) =>
    `${formatMm(item.lengthMm)} × ${formatMm(item.widthMm)} mm`

  if (backs[0]) {
    const item = backs[0][0]
    panels.push({
      label: item.label || 'Back',
      localX: t,
      localY: t,
      widthFrac: open,
      heightFrac: open,
      explodeX: 0.035,
      explodeY: -0.045,
      depthScale: 0.22,
      isDoor: false,
      isBack: true,
      sizeCaption: caption(item),
    })
  }

  for (const [item, isLeft] of sideItems) {
    const sideLabel =
      item.label.toLowerCase().includes('left') || item.label.toLowerCase().includes('right')
        ? item.label
        : isLeft
          ? 'Left side'
          : 'Right side'
    panels.push({
      label: sideLabel,
      localX: isLeft ? 0 : 1 - t,
      localY: 0,
      widthFrac: t,
      heightFrac: 1,
      explodeX: isLeft ? -0.16 : 0.16,
      explodeY: 0.01,
      depthScale: 1,
      isDoor: false,
      isBack: false,
      sizeCaption: caption(item),
    })
  }

  if (bottoms[0]) {
    const item = bottoms[0][0]
    panels.push({
      label: item.label || 'Bottom',
      localX: t,
      localY: 1 - t,
      widthFrac: open,
      heightFrac: t,
      explodeX: 0,
      explodeY: 0.14,
      depthScale: 0.9,
      isDoor: false,
      isBack: false,
      sizeCaption: caption(item),
    })
  }

  if (tops[0]) {
    const item = tops[0][0]
    panels.push({
      label: item.label || 'Top',
      localX: t,
      localY: 0,
      widthFrac: open,
      heightFrac: t,
      explodeX: 0,
      explodeY: -0.12,
      depthScale: 0.9,
      isDoor: false,
      isBack: false,
      sizeCaption: caption(item),
    })
  }

  if (!tops.length && rails.length) {
    const railH = t * 1.4
    const frontRails = rails.filter((r) => r.label.toLowerCase().includes('front'))
    const fronts = frontRails.length ? frontRails : rails.slice(0, 1)
    const backRails = rails.filter((r) => r.label.toLowerCase().includes('back'))
    fronts.forEach((item, i) => {
      const slice = open / fronts.length
      panels.push({
        label: item.label || 'Front rail',
        localX: t + i * slice,
        localY: 0,
        widthFrac: slice * 0.96,
        heightFrac: railH,
        explodeX: -0.04 + i * 0.08,
        explodeY: -0.1,
        depthScale: 0.55,
        isDoor: false,
        isBack: false,
        sizeCaption: caption(item),
      })
    })
    backRails.forEach((item, i) => {
      const slice = open / Math.max(1, backRails.length)
      panels.push({
        label: item.label || 'Back rail',
        localX: t + i * slice,
        localY: railH * 1.2,
        widthFrac: slice * 0.96,
        heightFrac: railH,
        explodeX: 0.02 + i * 0.03,
        explodeY: -0.14,
        depthScale: 0.4,
        isDoor: false,
        isBack: false,
        sizeCaption: caption(item),
      })
    })
  }

  if (partitions[0]) {
    const item = partitions[0]
    panels.push({
      label: item.label || 'Partition',
      localX: 0.5 - t * 0.5,
      localY: 0,
      widthFrac: t,
      heightFrac: 1,
      explodeX: 0.06,
      explodeY: 0.02,
      depthScale: 0.85,
      isDoor: false,
      isBack: false,
      sizeCaption: caption(item),
    })
  }

  if (toeKicks[0]) {
    const item = toeKicks[0]
    const kickH = t * 1.8
    panels.push({
      label: item.label || 'Toe kick',
      localX: t * 1.5,
      localY: 1 - kickH,
      widthFrac: open - t,
      heightFrac: kickH,
      explodeX: 0,
      explodeY: 0.18,
      depthScale: 0.35,
      isDoor: false,
      isBack: false,
      sizeCaption: caption(item),
    })
  }

  if (shelves.length) {
    const shelfT = t * 0.8
    const innerTop = t
    const innerBottom = 1 - t
    const span = Math.max(shelfT, innerBottom - innerTop - shelfT)
    shelves.forEach((item, i) => {
      const y =
        shelves.length === 1 ? 0.42 : innerTop + (span / (shelves.length + 1)) * (i + 1)
      const label =
        shelves.length === 1
          ? item.label || 'Shelf'
          : `${item.label || 'Shelf'} ${i + 1}`
      panels.push({
        label,
        localX: t,
        localY: y,
        widthFrac: open,
        heightFrac: shelfT,
        explodeX: 0.025 * (i + 1),
        explodeY: 0.07 + i * 0.025,
        depthScale: 0.65,
        isDoor: false,
        isBack: false,
        sizeCaption: caption(item),
      })
    })
  }

  const doorInset = t * 0.25
  const doorX = t + doorInset
  const doorW = open - doorInset * 2
  const doorY = t + doorInset
  const doorH = open - doorInset * 2
  const seam = 0.005

  if (falseDrawers.length && doors.length) {
    const falseItem = falseDrawers[0]
    const falseH = doorH * 0.3
    const lowerH = doorH - falseH - seam
    panels.push({
      label: falseItem.label || 'False drawer',
      localX: doorX,
      localY: doorY,
      widthFrac: doorW,
      heightFrac: falseH,
      explodeX: 0.11,
      explodeY: -0.02,
      depthScale: 0.16,
      isDoor: true,
      isBack: false,
      sizeCaption: caption(falseItem),
    })
    addSplitDoors(panels, doors, doorX, doorY + falseH + seam, doorW, lowerH, seam, caption)
  } else if (drawerFronts.length && doors.length) {
    const drawer = drawerFronts[0]
    const drawerH = doorH * 0.28
    const lowerH = doorH - drawerH - seam
    panels.push({
      label: drawer.label || 'Drawer front',
      localX: doorX,
      localY: doorY,
      widthFrac: doorW,
      heightFrac: drawerH,
      explodeX: 0.12,
      explodeY: -0.015,
      depthScale: 0.16,
      isDoor: true,
      isBack: false,
      sizeCaption: caption(drawer),
    })
    addSplitDoors(panels, doors, doorX, doorY + drawerH + seam, doorW, lowerH, seam, caption)
  } else if (drawerFronts.length) {
    const count = drawerFronts.length
    const gap = count >= 4 ? 0.006 : 0.008
    const rowH = (doorH - gap * Math.max(0, count - 1)) / Math.max(1, count)
    drawerFronts.forEach((item, i) => {
      panels.push({
        label: count === 1 ? item.label || 'Drawer front' : `${item.label || 'Drawer front'} ${i + 1}`,
        localX: doorX,
        localY: doorY + i * (rowH + gap),
        widthFrac: doorW,
        heightFrac: rowH,
        explodeX: 0.13,
        explodeY: 0.012 * i,
        depthScale: 0.16,
        isDoor: true,
        isBack: false,
        sizeCaption: caption(item),
      })
    })
  } else if (doors.length >= 2) {
    addSplitDoors(panels, doors, doorX, doorY, doorW, doorH, seam, caption)
  } else if (doors.length === 1) {
    const item = doors[0]
    panels.push({
      label: item.label || 'Door',
      localX: doorX,
      localY: doorY,
      widthFrac: doorW,
      heightFrac: doorH,
      explodeX: 0.12,
      explodeY: 0.07,
      depthScale: 0.18,
      isDoor: true,
      isBack: false,
      sizeCaption: caption(item),
    })
  } else if (falseDrawers.length) {
    const item = falseDrawers[0]
    panels.push({
      label: item.label || 'False drawer',
      localX: doorX,
      localY: doorY,
      widthFrac: doorW,
      heightFrac: doorH * 0.3,
      explodeX: 0.11,
      explodeY: -0.02,
      depthScale: 0.16,
      isDoor: true,
      isBack: false,
      sizeCaption: caption(item),
    })
  }

  return {
    panels,
    outerWidthMm: outerW,
    outerHeightMm: outerH,
    outerDepthMm: outerD,
    unmappedLabels: unmapped,
    isTemplateStructured: templateStructured,
  }
}

function expandByQuantity(items: CutItem[]): CutItem[] {
  return items.flatMap((item) => {
    const qty = Math.max(1, item.quantity)
    return Array.from({ length: qty }, () => ({ ...item, quantity: 1 }))
  })
}

function estimateThickness(
  heightMm: number | null | undefined,
  back: CutItem | undefined,
  side: CutItem | undefined,
): number | null {
  if (side && back && heightMm != null) {
    const backH = [back.lengthMm, back.widthMm].reduce((best, d) =>
      Math.abs(d - heightMm) < Math.abs(best - heightMm) ? d : best,
    )
    const delta = side.lengthMm - backH
    if (delta >= 4 && delta <= 40) return delta
  }
  return 18
}

function thicknessFraction(
  outerW: number | null,
  outerH: number | null,
  thicknessMm: number,
): number {
  const ref = Math.max(outerW ?? 0, outerH ?? 0, 600)
  return Math.min(0.08, Math.max(0.028, thicknessMm / ref))
}

function addSplitDoors(
  panels: IsoPanel[],
  doors: CutItem[],
  doorX: number,
  doorY: number,
  doorW: number,
  doorH: number,
  seam: number,
  caption: (item: CutItem) => string,
) {
  const half = (doorW - seam) * 0.5
  const left = doors[0]
  const right = doors[1] ?? doors[0]
  panels.push({
    label: doorLabel(left, 'Left door'),
    localX: doorX,
    localY: doorY,
    widthFrac: half,
    heightFrac: doorH,
    explodeX: -0.11,
    explodeY: 0.09,
    depthScale: 0.18,
    isDoor: true,
    isBack: false,
    sizeCaption: caption(left),
  })
  panels.push({
    label: doorLabel(right, 'Right door'),
    localX: doorX + half + seam,
    localY: doorY,
    widthFrac: half,
    heightFrac: doorH,
    explodeX: 0.11,
    explodeY: 0.09,
    depthScale: 0.18,
    isDoor: true,
    isBack: false,
    sizeCaption: caption(right),
  })
}

function doorLabel(item: CutItem, fallback: string): string {
  const n = item.label.toLowerCase()
  if (n.includes('left') || n.includes('right')) return item.label
  if (item.label.toLowerCase() === 'door' || !item.label.trim()) return fallback
  return item.label
}

function formatMm(mm: number): string {
  return Math.abs(mm - Math.round(mm)) < 1e-6 ? String(Math.round(mm)) : mm.toFixed(1)
}

function maxOf(values: number[]): number | null {
  if (!values.length) return null
  return Math.max(...values)
}
