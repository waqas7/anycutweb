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

export interface Project {
  id: string
  name: string
  notes: string
  createdAt: number
  updatedAt: number
  kerfMm: number
  unit: LengthUnit
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
}

export interface AppData {
  projects: Project[]
  cutItems: CutItem[]
  stockSheets: StockSheet[]
}

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
