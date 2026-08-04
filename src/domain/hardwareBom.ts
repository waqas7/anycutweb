import type { CutItem } from '../types'
import { classify } from './cabinetAssembly'
import type { PartRole } from '../types'

export interface HardwareBomLine {
  name: string
  quantity: number
  notes?: string
}

const TALL_DOOR_HEIGHT_MM = 1600
const SCREWS_PER_CARCASS_PANEL = 8

const carcassRoles = new Set<PartRole>([
  'LEFT_SIDE',
  'RIGHT_SIDE',
  'TOP',
  'BOTTOM',
  'BACK',
  'SHELF',
  'PARTITION',
  'RAIL',
  'TOE_KICK',
  'DRAWER_SIDE',
  'DRAWER_BACK',
  'DRAWER_BOTTOM',
])

export function computeHardwareBom(items: CutItem[]): HardwareBomLine[] {
  if (!items.length) return []

  let standardDoorHinges = 0
  let tallDoorHinges = 0
  let standardDoors = 0
  let tallDoors = 0
  let flapSets = 0
  let drawerSlidePairs = 0
  let handles = 0
  let carcassPanels = 0

  for (const item of items) {
    const qty = Math.max(1, item.quantity)
    const label = item.label.trim().toLowerCase()
    if (!label) continue
    const role = classify(item)

    if (label.includes('flap')) {
      flapSets += qty
      handles += qty
    } else if (role === 'DOOR') {
      const height = Math.max(item.lengthMm, item.widthMm)
      if (height >= TALL_DOOR_HEIGHT_MM) {
        tallDoors += qty
        tallDoorHinges += 3 * qty
      } else {
        standardDoors += qty
        standardDoorHinges += 2 * qty
      }
      handles += qty
    } else if (role === 'DRAWER_FRONT') {
      drawerSlidePairs += qty
      handles += qty
    } else if (role === 'FALSE_DRAWER') {
      handles += qty
    }

    if (carcassRoles.has(role)) carcassPanels += qty
  }

  const lines: HardwareBomLine[] = []
  const totalHinges = standardDoorHinges + tallDoorHinges
  if (totalHinges > 0) {
    const notes: string[] = []
    if (standardDoors > 0) notes.push(`${standardDoors} door(s) × 2`)
    if (tallDoors > 0) notes.push(`${tallDoors} tall (≥${TALL_DOOR_HEIGHT_MM} mm) × 3`)
    lines.push({ name: 'Door hinges', quantity: totalHinges, notes: notes.join('; ') })
  }
  if (flapSets > 0) {
    lines.push({
      name: 'Flap hinge / gas stay set',
      quantity: flapSets,
      notes: '1 set per flap shutter',
    })
  }
  if (drawerSlidePairs > 0) {
    lines.push({
      name: 'Drawer slide pair (soft-close)',
      quantity: drawerSlidePairs,
      notes: '1 pair per drawer front',
    })
  }
  if (handles > 0) {
    lines.push({
      name: 'Handles / knobs',
      quantity: handles,
      notes: '1 per door, flap, drawer front, false front',
    })
  }
  if (carcassPanels > 0) {
    lines.push({
      name: 'Confirmat screws (est.)',
      quantity: carcassPanels * SCREWS_PER_CARCASS_PANEL,
      notes: `≈${SCREWS_PER_CARCASS_PANEL} × ${carcassPanels} carcass/drawer panels`,
    })
  }
  return lines
}
