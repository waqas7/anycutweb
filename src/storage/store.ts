import type { AppData, CutItem, LengthUnit, Project, StockSheet } from '../types'
import { createId } from '../types'

const STORAGE_KEY = 'anycut-web-v1'

function emptyData(): AppData {
  return { projects: [], cutItems: [], stockSheets: [] }
}

function load(): AppData {
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

function save(data: AppData) {
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

export function getSnapshot(): AppData {
  return load()
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
  return load().projects.find((p) => p.id === id)
}

export function getCutItems(projectId: string): CutItem[] {
  return load().cutItems.filter((c) => c.projectId === projectId)
}

export function getStockSheets(projectId: string): StockSheet[] {
  return load().stockSheets.filter((s) => s.projectId === projectId)
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
