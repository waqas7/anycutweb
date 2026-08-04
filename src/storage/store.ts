import type {
  AppData,
  CutItem,
  LengthUnit,
  OffcutItem,
  PartRole,
  Project,
  ShopProfile,
  StockSheet,
} from '../types'
import {
  createId,
  defaultCutItemFields,
  emptyShopProfile,
  PART_ROLES,
} from '../types'

const STORAGE_KEY = 'anycut-web-v1'

/** Stable empty snapshot for SSR / getServerSnapshot (must be referentially equal). */
const SERVER_SNAPSHOT: AppData = {
  projects: [],
  cutItems: [],
  stockSheets: [],
  shopProfile: emptyShopProfile(),
  offcuts: [],
}

function emptyData(): AppData {
  return {
    projects: [],
    cutItems: [],
    stockSheets: [],
    shopProfile: emptyShopProfile(),
    offcuts: [],
  }
}

function normalizePartRole(raw: unknown): PartRole {
  if (typeof raw === 'string' && (PART_ROLES as readonly string[]).includes(raw)) {
    return raw as PartRole
  }
  return 'NONE'
}

function normalizeCutItem(raw: Partial<CutItem> & { id: string; projectId: string }): CutItem {
  const defaults = defaultCutItemFields()
  return {
    id: raw.id,
    projectId: raw.projectId,
    label: raw.label ?? '',
    lengthMm: Number(raw.lengthMm) || 0,
    widthMm: Number(raw.widthMm) || 0,
    quantity: Math.max(1, Math.floor(Number(raw.quantity) || 1)),
    materialType: raw.materialType ?? 'Plywood',
    canRotate: raw.canRotate ?? true,
    grainLocked: raw.grainLocked ?? false,
    partRole: normalizePartRole(raw.partRole),
    edgeBandTop: Boolean(raw.edgeBandTop ?? defaults.edgeBandTop),
    edgeBandBottom: Boolean(raw.edgeBandBottom ?? defaults.edgeBandBottom),
    edgeBandLeft: Boolean(raw.edgeBandLeft ?? defaults.edgeBandLeft),
    edgeBandRight: Boolean(raw.edgeBandRight ?? defaults.edgeBandRight),
  }
}

function normalizeProject(raw: Partial<Project> & { id: string }): Project {
  return {
    id: raw.id,
    name: raw.name ?? 'Untitled',
    notes: raw.notes ?? '',
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    kerfMm: Number(raw.kerfMm) || 3,
    unit: (raw.unit as LengthUnit) || 'mm',
    bandingPricePerUnit: Number(raw.bandingPricePerUnit) || 0,
    currencySymbol: raw.currencySymbol ?? '',
  }
}

function normalizeStock(raw: Partial<StockSheet> & { id: string; projectId: string }): StockSheet {
  return {
    id: raw.id,
    projectId: raw.projectId,
    label: raw.label ?? '',
    lengthMm: Number(raw.lengthMm) || 0,
    widthMm: Number(raw.widthMm) || 0,
    materialType: raw.materialType ?? 'Plywood',
    availableQuantity: Math.max(0, Math.floor(Number(raw.availableQuantity) || 0)),
    pricePerSheet: Number(raw.pricePerSheet) || 0,
  }
}

function normalizeShop(raw: Partial<ShopProfile> | undefined): ShopProfile {
  return {
    shopName: raw?.shopName ?? '',
    phone: raw?.phone ?? '',
    address: raw?.address ?? '',
    logoDataUrl: raw?.logoDataUrl ?? '',
  }
}

function normalizeOffcut(raw: Partial<OffcutItem> & { id: string }): OffcutItem {
  return {
    id: raw.id,
    label: raw.label ?? '',
    notes: raw.notes ?? '',
    lengthMm: Number(raw.lengthMm) || 0,
    widthMm: Number(raw.widthMm) || 0,
    materialType: raw.materialType ?? 'Plywood',
    sourceProjectId: raw.sourceProjectId ?? null,
    sourceProjectName: raw.sourceProjectName ?? '',
    fromSheetIndex: Number(raw.fromSheetIndex) || 0,
    createdAt: Number(raw.createdAt) || Date.now(),
  }
}

/** Small base cabinet carcass (~600×560×720, 18 mm ply) for first-time / empty demos. */
function buildSampleAppData(): AppData {
  const now = Date.now()
  const projectId = createId()
  const project: Project = {
    id: projectId,
    name: 'Sample · Base cabinet',
    notes: 'Demo 600×560×720 base carcass in 18 mm plywood. Edit or delete freely.',
    createdAt: now,
    updatedAt: now,
    kerfMm: 3,
    unit: 'mm',
    bandingPricePerUnit: 0,
    currencySymbol: '',
  }

  const ply = 'Plywood'
  const cut = (
    label: string,
    lengthMm: number,
    widthMm: number,
    quantity: number,
    partRole: PartRole,
    bands: Partial<Pick<CutItem, 'edgeBandTop' | 'edgeBandBottom' | 'edgeBandLeft' | 'edgeBandRight'>> = {},
  ): CutItem => ({
    id: createId(),
    projectId,
    label,
    lengthMm,
    widthMm,
    quantity,
    materialType: ply,
    canRotate: true,
    grainLocked: false,
    partRole,
    edgeBandTop: bands.edgeBandTop ?? false,
    edgeBandBottom: bands.edgeBandBottom ?? false,
    edgeBandLeft: bands.edgeBandLeft ?? false,
    edgeBandRight: bands.edgeBandRight ?? false,
  })

  return {
    projects: [project],
    cutItems: [
      cut('Left side', 720, 560, 1, 'LEFT_SIDE', { edgeBandTop: true, edgeBandBottom: true }),
      cut('Right side', 720, 560, 1, 'RIGHT_SIDE', { edgeBandTop: true, edgeBandBottom: true }),
      cut('Top', 564, 560, 1, 'TOP', {
        edgeBandTop: true,
        edgeBandBottom: true,
        edgeBandLeft: true,
        edgeBandRight: true,
      }),
      cut('Bottom', 564, 560, 1, 'BOTTOM', {
        edgeBandTop: true,
        edgeBandBottom: true,
        edgeBandLeft: true,
        edgeBandRight: true,
      }),
      cut('Back', 564, 702, 1, 'BACK'),
      cut('Shelf', 564, 540, 1, 'SHELF', { edgeBandTop: true }),
      cut('Door', 715, 297, 2, 'DOOR', {
        edgeBandTop: true,
        edgeBandBottom: true,
        edgeBandLeft: true,
        edgeBandRight: true,
      }),
    ],
    stockSheets: [
      {
        id: createId(),
        projectId,
        label: 'Euro full',
        lengthMm: 2440,
        widthMm: 1220,
        materialType: ply,
        availableQuantity: 0,
        pricePerSheet: 0,
      },
    ],
    shopProfile: emptyShopProfile(),
    offcuts: [],
  }
}

function readFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      projects: (parsed.projects ?? []).map((p) => normalizeProject(p as Project)),
      cutItems: (parsed.cutItems ?? []).map((c) =>
        normalizeCutItem(c as CutItem & { id: string; projectId: string }),
      ),
      stockSheets: (parsed.stockSheets ?? []).map((s) =>
        normalizeStock(s as StockSheet & { id: string; projectId: string }),
      ),
      shopProfile: normalizeShop(parsed.shopProfile),
      offcuts: (parsed.offcuts ?? []).map((o) =>
        normalizeOffcut(o as OffcutItem & { id: string }),
      ),
    }
  } catch {
    return emptyData()
  }
}

/** In-memory snapshot — same reference until a mutation calls save(). */
let cached: AppData | null = null

function ensureCached(): AppData {
  if (!cached) cached = readFromStorage()
  // Seed whenever empty so demos always have something (never overwrites other projects).
  if (cached.projects.length === 0) {
    cached = buildSampleAppData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
  }
  return cached
}

/**
 * Working copy for mutators. Always a new object so in-place edits
 * do not mutate the published getSnapshot() reference.
 */
function load(): AppData {
  const snap = ensureCached()
  return {
    projects: [...snap.projects],
    cutItems: [...snap.cutItems],
    stockSheets: [...snap.stockSheets],
    shopProfile: { ...snap.shopProfile },
    offcuts: [...snap.offcuts],
  }
}

function save(data: AppData) {
  cached = data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((l) => l())
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Must return the same reference until data changes (React useSyncExternalStore). */
export function getSnapshot(): AppData {
  return ensureCached()
}

export function getServerSnapshot(): AppData {
  return SERVER_SNAPSHOT
}

export function createProject(name: string, notes = ''): Project {
  const data = load()
  const now = Date.now()
  const project: Project = {
    id: createId(),
    name: name.trim() || 'Untitled project',
    notes,
    createdAt: now,
    updatedAt: now,
    kerfMm: 3,
    unit: 'mm',
    bandingPricePerUnit: 0,
    currencySymbol: '',
  }
  data.projects.unshift(project)
  data.stockSheets.push({
    id: createId(),
    projectId: project.id,
    label: 'Euro full',
    lengthMm: 2440,
    widthMm: 1220,
    materialType: 'Plywood',
    availableQuantity: 0,
    pricePerSheet: 0,
  })
  save(data)
  notify()
  return project
}

export function updateProject(id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>) {
  const data = load()
  const idx = data.projects.findIndex((p) => p.id === id)
  if (idx < 0) return
  data.projects[idx] = {
    ...data.projects[idx],
    ...patch,
    updatedAt: Date.now(),
  }
  save(data)
  notify()
}

export function deleteProject(id: string) {
  const data = load()
  data.projects = data.projects.filter((p) => p.id !== id)
  data.cutItems = data.cutItems.filter((c) => c.projectId !== id)
  data.stockSheets = data.stockSheets.filter((s) => s.projectId !== id)
  save(data)
  notify()
}

export function getProject(id: string): Project | undefined {
  return ensureCached().projects.find((p) => p.id === id)
}

export function getCutItems(projectId: string): CutItem[] {
  return ensureCached().cutItems.filter((c) => c.projectId === projectId)
}

export function getStockSheets(projectId: string): StockSheet[] {
  return ensureCached().stockSheets.filter((s) => s.projectId === projectId)
}

export function upsertCutItem(item: CutItem) {
  const data = load()
  const normalized = normalizeCutItem(item)
  const idx = data.cutItems.findIndex((c) => c.id === normalized.id)
  if (idx >= 0) data.cutItems[idx] = normalized
  else data.cutItems.push(normalized)
  touchProject(data, normalized.projectId)
  save(data)
  notify()
}

export function upsertCutItems(items: CutItem[]) {
  if (items.length === 0) return
  const data = load()
  for (const item of items) {
    const normalized = normalizeCutItem(item)
    const idx = data.cutItems.findIndex((c) => c.id === normalized.id)
    if (idx >= 0) data.cutItems[idx] = normalized
    else data.cutItems.push(normalized)
  }
  touchProject(data, items[0].projectId)
  save(data)
  notify()
}

export function replaceProjectCutItems(projectId: string, items: CutItem[]) {
  const data = load()
  data.cutItems = [
    ...data.cutItems.filter((c) => c.projectId !== projectId),
    ...items.map(normalizeCutItem),
  ]
  touchProject(data, projectId)
  save(data)
  notify()
}

export function deleteCutItem(id: string) {
  const data = load()
  const item = data.cutItems.find((c) => c.id === id)
  data.cutItems = data.cutItems.filter((c) => c.id !== id)
  if (item) touchProject(data, item.projectId)
  save(data)
  notify()
}

export function upsertStockSheet(sheet: StockSheet) {
  const data = load()
  const normalized = normalizeStock(sheet)
  const idx = data.stockSheets.findIndex((s) => s.id === normalized.id)
  if (idx >= 0) data.stockSheets[idx] = normalized
  else data.stockSheets.push(normalized)
  touchProject(data, normalized.projectId)
  save(data)
  notify()
}

export function deleteStockSheet(id: string) {
  const data = load()
  const sheet = data.stockSheets.find((s) => s.id === id)
  data.stockSheets = data.stockSheets.filter((s) => s.id !== id)
  if (sheet) touchProject(data, sheet.projectId)
  save(data)
  notify()
}

export function setProjectUnit(projectId: string, unit: LengthUnit) {
  updateProject(projectId, { unit })
}

export function updateShopProfile(patch: Partial<ShopProfile>) {
  const data = load()
  data.shopProfile = normalizeShop({ ...data.shopProfile, ...patch })
  save(data)
  notify()
}

export function getShopProfile(): ShopProfile {
  return ensureCached().shopProfile
}

export function addOffcut(item: Omit<OffcutItem, 'id' | 'createdAt'> & { id?: string }) {
  const data = load()
  const full = normalizeOffcut({
    ...item,
    id: item.id ?? createId(),
    createdAt: Date.now(),
  })
  data.offcuts.unshift(full)
  save(data)
  notify()
  return full
}

export function updateOffcut(id: string, patch: Partial<Omit<OffcutItem, 'id' | 'createdAt'>>) {
  const data = load()
  const idx = data.offcuts.findIndex((o) => o.id === id)
  if (idx < 0) return
  data.offcuts[idx] = normalizeOffcut({ ...data.offcuts[idx], ...patch })
  save(data)
  notify()
}

export function deleteOffcut(id: string) {
  const data = load()
  data.offcuts = data.offcuts.filter((o) => o.id !== id)
  save(data)
  notify()
}

export function addOffcutAsStock(offcutId: string, projectId: string) {
  const data = load()
  const offcut = data.offcuts.find((o) => o.id === offcutId)
  if (!offcut) return
  data.stockSheets.push({
    id: createId(),
    projectId,
    label: offcut.label || `Offcut ${Math.round(offcut.lengthMm)}×${Math.round(offcut.widthMm)}`,
    lengthMm: offcut.lengthMm,
    widthMm: offcut.widthMm,
    materialType: offcut.materialType,
    availableQuantity: 1,
    pricePerSheet: 0,
  })
  touchProject(data, projectId)
  save(data)
  notify()
}

function touchProject(data: AppData, projectId: string) {
  const p = data.projects.find((x) => x.id === projectId)
  if (p) p.updatedAt = Date.now()
}
