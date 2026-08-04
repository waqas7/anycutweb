import { useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as store from '../storage/store'
import {
  createId,
  MATERIAL_TYPES,
  PART_ROLE_LABELS,
  PART_ROLE_PICKER,
  type CutItem,
  type LengthUnit,
  type PartRole,
  type StockSheet,
} from '../types'
import { displayValueForInput, formatDim, formatSize, parseToMm, unitSymbol } from '../domain/units'
import { STOCK_PRESETS } from '../domain/stockPresets'
import { downloadText, exportCutListCsv, exportPartLabelsPdf } from '../export/io'
import { computeBandingBom, bandingTotalMm } from '../domain/banding'
import { computeHardwareBom } from '../domain/hardwareBom'
import { looksLikeTemplateCarcass } from '../domain/cabinetAssembly'
import {
  CABINET_TEMPLATES,
  generateCabinetParts,
  type CabinetTemplateId,
} from '../domain/cabinetTemplates'
import { CSV_COLUMN_HINT, parseCutListCsv } from '../domain/csvImport'

export function ProjectDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  const project = data.projects.find((p) => p.id === id)
  const items = useMemo(
    () => data.cutItems.filter((c) => c.projectId === id),
    [data.cutItems, id],
  )
  const stock = useMemo(
    () => data.stockSheets.filter((s) => s.projectId === id),
    [data.stockSheets, id],
  )
  const shop = data.shopProfile

  const [tab, setTab] = useState<'cuts' | 'stock' | 'templates' | 'bom'>('cuts')
  const [editingCut, setEditingCut] = useState<CutItem | null>(null)
  const [editingStock, setEditingStock] = useState<StockSheet | null>(null)
  const [showCutForm, setShowCutForm] = useState(false)
  const [showStockForm, setShowStockForm] = useState(false)
  const csvRef = useRef<HTMLInputElement>(null)

  const banding = useMemo(() => computeBandingBom(items), [items])
  const hardware = useMemo(() => computeHardwareBom(items), [items])
  const can3d = looksLikeTemplateCarcass(items)

  if (!project) {
    return (
      <div className="page">
        <p>Project not found.</p>
        <Link to="/">Back to dashboard</Link>
      </div>
    )
  }

  const unit = project.unit

  function onImportCsv(file: File | null) {
    if (!file || !project) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const result = parseCutListCsv(text, project.id, project.unit)
      if (result.items.length) {
        store.upsertCutItems(result.items)
      }
      const msg = [
        `Imported ${result.items.length} part(s)`,
        result.errors.length ? `${result.errors.length} error(s)` : null,
        result.skippedBlankRows ? `${result.skippedBlankRows} blank skipped` : null,
      ]
        .filter(Boolean)
        .join(' · ')
      alert(
        result.errors.length
          ? `${msg}\n\n${result.errors.slice(0, 8).join('\n')}`
          : msg,
      )
    }
    reader.readAsText(file)
  }

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
            {banding.length > 0
              ? ` · banding ${formatDim(bandingTotalMm(items), unit)}`
              : ''}
          </p>
        </div>
        <div className="header-actions">
          <UnitToggle
            unit={unit}
            onChange={(u) => store.setProjectUnit(project.id, u)}
          />
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => onImportCsv(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => csvRef.current?.click()}
            title={CSV_COLUMN_HINT}
          >
            Import CSV
          </button>
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
          <button
            type="button"
            className="btn btn-ghost"
            disabled={items.length === 0}
            onClick={() => exportPartLabelsPdf(project, items, unit, shop)}
          >
            Labels PDF
          </button>
          {can3d ? (
            <Link className="btn btn-ghost" to={`/project/${project.id}/3d`}>
              View 3D
            </Link>
          ) : (
            <button type="button" className="btn btn-ghost" disabled title="Need carcass roles">
              View 3D
            </button>
          )}
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
        <label>
          Banding rate / {unitSymbol(unit)}
          <input
            type="number"
            min={0}
            step="any"
            value={project.bandingPricePerUnit || ''}
            placeholder="0"
            onChange={(e) =>
              store.updateProject(project.id, {
                bandingPricePerUnit: Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </label>
        <label>
          Currency
          <input
            value={project.currencySymbol}
            placeholder="$ / Rs"
            onChange={(e) =>
              store.updateProject(project.id, { currencySymbol: e.target.value })
            }
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
        {(
          [
            ['cuts', `Cut list (${items.length})`],
            ['stock', `Stock (${stock.length})`],
            ['templates', 'Templates'],
            ['bom', 'BOM / banding'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'tab is-active' : 'tab'}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
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
                    <th>Role</th>
                    <th>Size</th>
                    <th>Qty</th>
                    <th>Material</th>
                    <th>Band</th>
                    <th>Rotate</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.label}</td>
                      <td>{PART_ROLE_LABELS[item.partRole]}</td>
                      <td>{formatSize(item.lengthMm, item.widthMm, unit)}</td>
                      <td>{item.quantity}</td>
                      <td>{item.materialType}</td>
                      <td>
                        {[
                          item.edgeBandTop && 'T',
                          item.edgeBandBottom && 'B',
                          item.edgeBandLeft && 'L',
                          item.edgeBandRight && 'R',
                        ]
                          .filter(Boolean)
                          .join('') || '—'}
                      </td>
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
              currency={project.currencySymbol}
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
                    <th>Price / sheet</th>
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
                      <td>
                        {s.pricePerSheet > 0
                          ? `${project.currencySymbol ? `${project.currencySymbol} ` : ''}${s.pricePerSheet}`
                          : '—'}
                      </td>
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

      {tab === 'templates' && (
        <TemplatesPanel
          projectId={project.id}
          unit={unit}
          onApplied={() => setTab('cuts')}
        />
      )}

      {tab === 'bom' && (
        <section className="section">
          <div className="panel">
            <h2>Hardware BOM</h2>
            {hardware.length === 0 ? (
              <p className="empty-inline">No hardware estimated yet — add doors / drawers / carcass roles.</p>
            ) : (
              <ul className="bom-list">
                {hardware.map((line) => (
                  <li key={line.name}>
                    <strong>
                      {line.quantity}× {line.name}
                    </strong>
                    {line.notes && <span className="muted"> — {line.notes}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="panel">
            <h2>Edge banding</h2>
            {banding.length === 0 ? (
              <p className="empty-inline">No banding flags set on parts.</p>
            ) : (
              <>
                <p>
                  Total:{' '}
                  <strong>{formatDim(bandingTotalMm(items), unit)}</strong>
                </p>
                <ul className="bom-list">
                  {banding.map((line) => (
                    <li key={`${line.materialType}-${line.segmentLengthMm}`}>
                      {line.materialType} · {formatDim(line.segmentLengthMm, unit)} ×{' '}
                      {line.segmentCount} = {formatDim(line.totalLengthMm, unit)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
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

function TemplatesPanel({
  projectId,
  unit,
  onApplied,
}: {
  projectId: string
  unit: LengthUnit
  onApplied: () => void
}) {
  const [selected, setSelected] = useState<CabinetTemplateId>('BASE_2_DOOR')
  const meta = CABINET_TEMPLATES.find((t) => t.id === selected)!
  const [width, setWidth] = useState(displayValueForInput(meta.defaults.widthMm, unit))
  const [height, setHeight] = useState(displayValueForInput(meta.defaults.heightMm, unit))
  const [depth, setDepth] = useState(displayValueForInput(meta.defaults.depthMm, unit))
  const [thickness, setThickness] = useState(displayValueForInput(18, unit))
  const [includeDoors, setIncludeDoors] = useState(true)
  const [replace, setReplace] = useState(true)

  function pick(id: CabinetTemplateId) {
    setSelected(id)
    const m = CABINET_TEMPLATES.find((t) => t.id === id)!
    setWidth(displayValueForInput(m.defaults.widthMm, unit))
    setHeight(displayValueForInput(m.defaults.heightMm, unit))
    setDepth(displayValueForInput(m.defaults.depthMm, unit))
  }

  function apply() {
    const w = parseToMm(width, unit)
    const h = parseToMm(height, unit)
    const d = parseToMm(depth, unit)
    const t = parseToMm(thickness, unit)
    if (w == null || h == null || d == null || t == null) {
      alert('Enter valid dimensions')
      return
    }
    const parts = generateCabinetParts(projectId, {
      template: selected,
      widthMm: w,
      heightMm: h,
      depthMm: d,
      thicknessMm: t,
      materialType: 'Plywood',
      doorMaterial: 'Plywood',
      includeDoors,
      grainOnSides: true,
    })
    if (replace) store.replaceProjectCutItems(projectId, parts)
    else store.upsertCutItems(parts)
    onApplied()
  }

  return (
    <section className="section">
      <div className="section-head">
        <h2>Cabinet templates</h2>
      </div>
      <div className="template-grid">
        {CABINET_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`template-card ${selected === t.id ? 'is-active' : ''}`}
            onClick={() => pick(t.id)}
          >
            <span className="template-card__title">
              {t.displayName}
              {t.requiresPremium && <span className="badge-premium">Premium</span>}
            </span>
            <span className="template-card__desc">{t.description}</span>
          </button>
        ))}
      </div>
      <div className="panel form-grid">
        <label>
          Width ({unitSymbol(unit)})
          <input value={width} onChange={(e) => setWidth(e.target.value)} />
        </label>
        <label>
          Height ({unitSymbol(unit)})
          <input value={height} onChange={(e) => setHeight(e.target.value)} />
        </label>
        <label>
          Depth ({unitSymbol(unit)})
          <input value={depth} onChange={(e) => setDepth(e.target.value)} />
        </label>
        <label>
          Thickness ({unitSymbol(unit)})
          <input value={thickness} onChange={(e) => setThickness(e.target.value)} />
        </label>
        <div className="check-row">
          <label className="check">
            <input
              type="checkbox"
              checked={includeDoors}
              onChange={(e) => setIncludeDoors(e.target.checked)}
            />
            Include doors / fronts
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
            />
            Replace existing cut list
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={apply}>
            Generate parts
          </button>
        </div>
      </div>
      <p className="algo-note">
        Premium templates are unlocked on web (badge only). Free list matches Android basics.
      </p>
    </section>
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
  const [partRole, setPartRole] = useState<PartRole>(initial?.partRole ?? 'NONE')
  const [edgeBandTop, setEdgeBandTop] = useState(initial?.edgeBandTop ?? false)
  const [edgeBandBottom, setEdgeBandBottom] = useState(initial?.edgeBandBottom ?? false)
  const [edgeBandLeft, setEdgeBandLeft] = useState(initial?.edgeBandLeft ?? false)
  const [edgeBandRight, setEdgeBandRight] = useState(initial?.edgeBandRight ?? false)
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
      partRole,
      edgeBandTop,
      edgeBandBottom,
      edgeBandLeft,
      edgeBandRight,
    })
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <label>
        Label
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Side panel" />
      </label>
      <label>
        Role
        <select value={partRole} onChange={(e) => setPartRole(e.target.value as PartRole)}>
          {PART_ROLE_PICKER.map((r) => (
            <option key={r} value={r}>
              {PART_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
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
      <div className="check-row">
        <span className="edge-label">Edge banding</span>
        <label className="check">
          <input
            type="checkbox"
            checked={edgeBandTop}
            onChange={(e) => setEdgeBandTop(e.target.checked)}
          />
          Top
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={edgeBandBottom}
            onChange={(e) => setEdgeBandBottom(e.target.checked)}
          />
          Bottom
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={edgeBandLeft}
            onChange={(e) => setEdgeBandLeft(e.target.checked)}
          />
          Left
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={edgeBandRight}
            onChange={(e) => setEdgeBandRight(e.target.checked)}
          />
          Right
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
  currency,
  initial,
  onSave,
  onCancel,
}: {
  projectId: string
  unit: LengthUnit
  currency: string
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
  const [price, setPrice] = useState(String(initial?.pricePerSheet ?? 0))
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
    const pricePerSheet = Math.max(0, Number(price) || 0)
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
      pricePerSheet,
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
      <label>
        Price / sheet{currency ? ` (${currency})` : ''}
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="decimal"
          placeholder="0"
        />
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
