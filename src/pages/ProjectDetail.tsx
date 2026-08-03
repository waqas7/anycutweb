import { useMemo, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as store from '../storage/store'
import { createId, MATERIAL_TYPES, type CutItem, type LengthUnit, type StockSheet } from '../types'
import { displayValueForInput, formatSize, parseToMm, unitSymbol } from '../domain/units'
import { STOCK_PRESETS } from '../domain/stockPresets'
import { downloadText, exportCutListCsv } from '../export/io'

export function ProjectDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const project = data.projects.find((p) => p.id === id)
  const items = useMemo(
    () => data.cutItems.filter((c) => c.projectId === id),
    [data.cutItems, id],
  )
  const stock = useMemo(
    () => data.stockSheets.filter((s) => s.projectId === id),
    [data.stockSheets, id],
  )

  const [tab, setTab] = useState<'cuts' | 'stock'>('cuts')
  const [editingCut, setEditingCut] = useState<CutItem | null>(null)
  const [editingStock, setEditingStock] = useState<StockSheet | null>(null)
  const [showCutForm, setShowCutForm] = useState(false)
  const [showStockForm, setShowStockForm] = useState(false)

  if (!project) {
    return (
      <div className="page">
        <p>Project not found.</p>
        <Link to="/">Back to dashboard</Link>
      </div>
    )
  }

  const unit = project.unit

  return (
    <div className="page">
      <nav className="breadcrumbs">
        <Link to="/">Projects</Link>
        <span>/</span>
        <span>{project.name}</span>
      </nav>

      <header className="page-header">
        <div>
          <h1>{project.name}</h1>
          <p className="lede muted">
            Kerf {displayValueForInput(project.kerfMm, unit)} {unitSymbol(unit)} ·{' '}
            {items.reduce((s, i) => s + i.quantity, 0)} parts
          </p>
        </div>
        <div className="header-actions">
          <UnitToggle
            unit={unit}
            onChange={(u) => store.setProjectUnit(project.id, u)}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const csv = exportCutListCsv(items, unit)
              downloadText(`${project.name}-cutlist.csv`, csv)
            }}
          >
            Export CSV
          </button>
          <Link className="btn btn-primary" to={`/project/${project.id}/optimize`}>
            Optimize
          </Link>
        </div>
      </header>

      <div className="panel settings-strip">
        <label>
          Project name
          <input
            value={project.name}
            onChange={(e) => store.updateProject(project.id, { name: e.target.value })}
          />
        </label>
        <label>
          Kerf ({unitSymbol(unit)})
          <input
            type="text"
            defaultValue={displayValueForInput(project.kerfMm, unit)}
            key={`${project.id}-${unit}-kerf`}
            onBlur={(e) => {
              const mm = parseToMm(e.target.value, unit)
              if (mm != null && mm >= 0) store.updateProject(project.id, { kerfMm: mm })
            }}
          />
        </label>
        <label className="grow">
          Notes
          <input
            value={project.notes}
            onChange={(e) => store.updateProject(project.id, { notes: e.target.value })}
            placeholder="Optional shop notes"
          />
        </label>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={tab === 'cuts' ? 'tab is-active' : 'tab'}
          onClick={() => setTab('cuts')}
        >
          Cut list ({items.length})
        </button>
        <button
          type="button"
          className={tab === 'stock' ? 'tab is-active' : 'tab'}
          onClick={() => setTab('stock')}
        >
          Stock ({stock.length})
        </button>
      </div>

      {tab === 'cuts' && (
        <section className="section">
          <div className="section-head">
            <h2>Parts to cut</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingCut(null)
                setShowCutForm(true)
              }}
            >
              Add part
            </button>
          </div>

          {showCutForm && (
            <CutItemForm
              projectId={project.id}
              unit={unit}
              initial={editingCut}
              onCancel={() => {
                setShowCutForm(false)
                setEditingCut(null)
              }}
              onSave={(item) => {
                store.upsertCutItem(item)
                setShowCutForm(false)
                setEditingCut(null)
              }}
            />
          )}

          {items.length === 0 ? (
            <p className="empty-inline">No parts yet — add shelves, sides, doors…</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Size</th>
                    <th>Qty</th>
                    <th>Material</th>
                    <th>Rotate</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.label}</td>
                      <td>{formatSize(item.lengthMm, item.widthMm, unit)}</td>
                      <td>{item.quantity}</td>
                      <td>{item.materialType}</td>
                      <td>
                        {item.grainLocked ? 'Grain lock' : item.canRotate ? 'Yes' : 'No'}
                      </td>
                      <td className="row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditingCut(item)
                            setShowCutForm(true)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => store.deleteCutItem(item.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'stock' && (
        <section className="section">
          <div className="section-head">
            <h2>Stock sheets</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingStock(null)
                setShowStockForm(true)
              }}
            >
              Add stock
            </button>
          </div>

          {showStockForm && (
            <StockForm
              projectId={project.id}
              unit={unit}
              initial={editingStock}
              onCancel={() => {
                setShowStockForm(false)
                setEditingStock(null)
              }}
              onSave={(sheet) => {
                store.upsertStockSheet(sheet)
                setShowStockForm(false)
                setEditingStock(null)
              }}
            />
          )}

          {stock.length === 0 ? (
            <p className="empty-inline">Add at least one stock size before optimizing.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Size</th>
                    <th>Material</th>
                    <th>Available</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {stock.map((s) => (
                    <tr key={s.id}>
                      <td>{s.label || '—'}</td>
                      <td>{formatSize(s.lengthMm, s.widthMm, unit)}</td>
                      <td>{s.materialType}</td>
                      <td>{s.availableQuantity <= 0 ? 'Unlimited' : s.availableQuantity}</td>
                      <td className="row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditingStock(s)
                            setShowStockForm(true)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => store.deleteStockSheet(s.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="footer-actions">
        <button
          type="button"
          className="btn btn-danger-ghost"
          onClick={() => {
            if (confirm(`Delete “${project.name}”?`)) {
              store.deleteProject(project.id)
              navigate('/')
            }
          }}
        >
          Delete project
        </button>
      </div>
    </div>
  )
}

function UnitToggle({
  unit,
  onChange,
}: {
  unit: LengthUnit
  onChange: (u: LengthUnit) => void
}) {
  return (
    <div className="unit-toggle" role="group" aria-label="Display units">
      {(['mm', 'in', 'ft'] as LengthUnit[]).map((u) => (
        <button
          key={u}
          type="button"
          className={unit === u ? 'is-active' : ''}
          onClick={() => onChange(u)}
        >
          {u}
        </button>
      ))}
    </div>
  )
}

function CutItemForm({
  projectId,
  unit,
  initial,
  onSave,
  onCancel,
}: {
  projectId: string
  unit: LengthUnit
  initial: CutItem | null
  onSave: (item: CutItem) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [length, setLength] = useState(
    initial ? displayValueForInput(initial.lengthMm, unit) : '',
  )
  const [width, setWidth] = useState(
    initial ? displayValueForInput(initial.widthMm, unit) : '',
  )
  const [qty, setQty] = useState(String(initial?.quantity ?? 1))
  const [material, setMaterial] = useState(initial?.materialType ?? 'Plywood')
  const [canRotate, setCanRotate] = useState(initial?.canRotate ?? true)
  const [grainLocked, setGrainLocked] = useState(initial?.grainLocked ?? false)
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const lengthMm = parseToMm(length, unit)
    const widthMm = parseToMm(width, unit)
    const quantity = Math.max(1, Math.floor(Number(qty) || 1))
    if (!label.trim()) {
      setError('Label is required')
      return
    }
    if (lengthMm == null || widthMm == null || lengthMm <= 0 || widthMm <= 0) {
      setError('Enter valid length and width')
      return
    }
    onSave({
      id: initial?.id ?? createId(),
      projectId,
      label: label.trim(),
      lengthMm,
      widthMm,
      quantity,
      materialType: material,
      canRotate,
      grainLocked,
    })
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <label>
        Label
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Side panel" />
      </label>
      <label>
        Length ({unitSymbol(unit)})
        <input value={length} onChange={(e) => setLength(e.target.value)} />
      </label>
      <label>
        Width ({unitSymbol(unit)})
        <input value={width} onChange={(e) => setWidth(e.target.value)} />
      </label>
      <label>
        Quantity
        <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" />
      </label>
      <label>
        Material
        <select value={material} onChange={(e) => setMaterial(e.target.value)}>
          {MATERIAL_TYPES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <div className="check-row">
        <label className="check">
          <input
            type="checkbox"
            checked={canRotate && !grainLocked}
            disabled={grainLocked}
            onChange={(e) => setCanRotate(e.target.checked)}
          />
          Allow 90° rotate
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={grainLocked}
            onChange={(e) => {
              setGrainLocked(e.target.checked)
              if (e.target.checked) setCanRotate(false)
            }}
          />
          Grain locked
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {initial ? 'Save part' : 'Add part'}
        </button>
      </div>
    </form>
  )
}

function StockForm({
  projectId,
  unit,
  initial,
  onSave,
  onCancel,
}: {
  projectId: string
  unit: LengthUnit
  initial: StockSheet | null
  onSave: (sheet: StockSheet) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [length, setLength] = useState(
    initial ? displayValueForInput(initial.lengthMm, unit) : displayValueForInput(2440, unit),
  )
  const [width, setWidth] = useState(
    initial ? displayValueForInput(initial.widthMm, unit) : displayValueForInput(1220, unit),
  )
  const [material, setMaterial] = useState(initial?.materialType ?? 'Plywood')
  const [available, setAvailable] = useState(String(initial?.availableQuantity ?? 0))
  const [error, setError] = useState('')

  function applyPreset(lengthMm: number, widthMm: number, shortName: string) {
    setLength(displayValueForInput(lengthMm, unit))
    setWidth(displayValueForInput(widthMm, unit))
    if (!label) setLabel(shortName)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const lengthMm = parseToMm(length, unit)
    const widthMm = parseToMm(width, unit)
    const availableQuantity = Math.max(0, Math.floor(Number(available) || 0))
    if (lengthMm == null || widthMm == null || lengthMm <= 0 || widthMm <= 0) {
      setError('Enter valid sheet size')
      return
    }
    onSave({
      id: initial?.id ?? createId(),
      projectId,
      label: label.trim(),
      lengthMm,
      widthMm,
      materialType: material,
      availableQuantity,
    })
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <div className="preset-chips">
        {STOCK_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            onClick={() => applyPreset(p.lengthMm, p.widthMm, p.shortName)}
          >
            {p.shortName}
          </button>
        ))}
      </div>
      <label>
        Label
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Full sheet" />
      </label>
      <label>
        Length ({unitSymbol(unit)})
        <input value={length} onChange={(e) => setLength(e.target.value)} />
      </label>
      <label>
        Width ({unitSymbol(unit)})
        <input value={width} onChange={(e) => setWidth(e.target.value)} />
      </label>
      <label>
        Material
        <select value={material} onChange={(e) => setMaterial(e.target.value)}>
          {MATERIAL_TYPES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label>
        Available (0 = unlimited)
        <input value={available} onChange={(e) => setAvailable(e.target.value)} inputMode="numeric" />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {initial ? 'Save stock' : 'Add stock'}
        </button>
      </div>
    </form>
  )
}
