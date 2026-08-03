import type { AppData, CutItem, LengthUnit, Project, StockSheet } from '../types'
import { createId } from '../types'

const STORAGE_KEY = 'anycut-web-v1'

/** Stable empty snapshot for SSR / getServerSnapshot (must be referentially equal). */
const SERVER_SNAPSHOT: AppData = { projects: [], cutItems: [], stockSheets: [] }

function emptyData(): AppData {
  return { projects: [], cutItems: [], stockSheets: [] }
}

function readFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as AppData
    return {
      projects: parsed.projects ?? [],
      cutItems: parsed.cutItems ?? [],
      stockSheets: parsed.stockSheets ?? [],
    }
  } catch {
    return emptyData()
  }
}

/** In-memory snapshot — same reference until a mutation calls save(). */
let cached: AppData | null = null

function ensureCached(): AppData {
  if (!cached) cached = readFromStorage()
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
  }
  data.projects.unshift(project)
  // Default Euro full plywood stock
  data.stockSheets.push({
    id: createId(),
    projectId: project.id,
    label: 'Euro full',
    lengthMm: 2440,
    widthMm: 1220,
    materialType: 'Plywood',
    availableQuantity: 0,
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
  const idx = data.cutItems.findIndex((c) => c.id === item.id)
  if (idx >= 0) data.cutItems[idx] = item
  else data.cutItems.push(item)
  touchProject(data, item.projectId)
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
  const idx = data.stockSheets.findIndex((s) => s.id === sheet.id)
  if (idx >= 0) data.stockSheets[idx] = sheet
  else data.stockSheets.push(sheet)
  touchProject(data, sheet.projectId)
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

function touchProject(data: AppData, projectId: string) {
  const p = data.projects.find((x) => x.id === projectId)
  if (p) p.updatedAt = Date.now()
}
