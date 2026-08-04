export type LengthUnit = 'mm' | 'in' | 'ft'

export const MATERIAL_TYPES = [
  'Plywood',
  'MDF',
  'HDF',
  'Particle Board',
  'OSB',
  'Melamine',
  'Laminate',
  'Hardwood',
  'Softwood',
  'Acrylic',
  'Wood',
  'Other',
] as const

export type MaterialType = (typeof MATERIAL_TYPES)[number]

/** Structural role for 3D assembly / hardware BOM. */
export const PART_ROLES = [
  'NONE',
  'LEFT_SIDE',
  'RIGHT_SIDE',
  'TOP',
  'BOTTOM',
  'BACK',
  'SHELF',
  'DOOR',
  'DRAWER_FRONT',
  'FALSE_DRAWER',
  'DRAWER_BOTTOM',
  'DRAWER_SIDE',
  'DRAWER_BACK',
  'RAIL',
  'TOE_KICK',
  'PARTITION',
  'UNKNOWN',
] as const

export type PartRole = (typeof PART_ROLES)[number]

export const PART_ROLE_LABELS: Record<PartRole, string> = {
  NONE: 'None',
  LEFT_SIDE: 'Left side',
  RIGHT_SIDE: 'Right side',
  TOP: 'Top',
  BOTTOM: 'Bottom',
  BACK: 'Back',
  SHELF: 'Shelf',
  DOOR: 'Door',
  DRAWER_FRONT: 'Drawer front',
  FALSE_DRAWER: 'False drawer',
  DRAWER_BOTTOM: 'Drawer bottom',
  DRAWER_SIDE: 'Drawer side',
  DRAWER_BACK: 'Drawer back',
  RAIL: 'Rail',
  TOE_KICK: 'Toe kick',
  PARTITION: 'Partition',
  UNKNOWN: 'Unknown',
}

/** Roles offered in the cut-item editor (excludes Unknown). */
export const PART_ROLE_PICKER: PartRole[] = PART_ROLES.filter((r) => r !== 'UNKNOWN')

export function isPartRoleAssigned(role: PartRole): boolean {
  return role !== 'NONE' && role !== 'UNKNOWN'
}

export interface Project {
  id: string
  name: string
  notes: string
  createdAt: number
  updatedAt: number
  kerfMm: number
  unit: LengthUnit
  /** Edge banding rate (price per display length unit). */
  bandingPricePerUnit: number
  /** Optional currency label for cost display (e.g. Rs, $). */
  currencySymbol: string
}

export interface CutItem {
  id: string
  projectId: string
  label: string
  lengthMm: number
  widthMm: number
  quantity: number
  materialType: string
  canRotate: boolean
  grainLocked: boolean
  partRole: PartRole
  /** Banding along length (X). */
  edgeBandTop: boolean
  edgeBandBottom: boolean
  /** Banding along width (Y). */
  edgeBandLeft: boolean
  edgeBandRight: boolean
}

export interface StockSheet {
  id: string
  projectId: string
  label: string
  lengthMm: number
  widthMm: number
  materialType: string
  /** 0 = unlimited */
  availableQuantity: number
  /** Material price charged per opened sheet. */
  pricePerSheet: number
}

export interface ShopProfile {
  shopName: string
  phone: string
  address: string
  /** Data-URL (JPEG/PNG) for PDF headers; empty if none. */
  logoDataUrl: string
}

export interface OffcutItem {
  id: string
  label: string
  notes: string
  lengthMm: number
  widthMm: number
  materialType: string
  sourceProjectId: string | null
  sourceProjectName: string
  fromSheetIndex: number
  createdAt: number
}

export interface AppData {
  projects: Project[]
  cutItems: CutItem[]
  stockSheets: StockSheet[]
  shopProfile: ShopProfile
  offcuts: OffcutItem[]
}

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyShopProfile(): ShopProfile {
  return { shopName: '', phone: '', address: '', logoDataUrl: '' }
}

export function bandingSegments(item: CutItem): Array<{ edge: string; lengthMm: number }> {
  const out: Array<{ edge: string; lengthMm: number }> = []
  if (item.edgeBandTop) out.push({ edge: 'Top', lengthMm: item.lengthMm })
  if (item.edgeBandBottom) out.push({ edge: 'Bottom', lengthMm: item.lengthMm })
  if (item.edgeBandLeft) out.push({ edge: 'Left', lengthMm: item.widthMm })
  if (item.edgeBandRight) out.push({ edge: 'Right', lengthMm: item.widthMm })
  return out
}

export function defaultCutItemFields(): Pick<
  CutItem,
  | 'partRole'
  | 'edgeBandTop'
  | 'edgeBandBottom'
  | 'edgeBandLeft'
  | 'edgeBandRight'
> {
  return {
    partRole: 'NONE',
    edgeBandTop: false,
    edgeBandBottom: false,
    edgeBandLeft: false,
    edgeBandRight: false,
  }
}
