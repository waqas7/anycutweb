import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as store from '../storage/store'
import { optimize, type OptimizationResult } from '../domain/optimizer'
import { LayoutPreview } from '../components/LayoutPreview'
import { downloadText, exportLayoutCsv, exportLayoutPdf } from '../export/io'

export function OptimizePage() {
  const { id = '' } = useParams()
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

  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [error, setError] = useState('')
  const [highlight, setHighlight] = useState<string | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)

  if (!project) {
    return (
      <div className="page">
        <p>Project not found.</p>
        <Link to="/">Back</Link>
      </div>
    )
  }

  function runOptimize() {
    setError('')
    try {
      if (items.length === 0) {
        setError('Add cut parts before optimizing.')
        return
      }
      if (stock.length === 0) {
        setError('Add at least one stock sheet.')
        return
      }
      const next = optimize(items, stock, project!.kerfMm)
      setResult(next)
      setSheetIndex(0)
      setHighlight(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimize failed')
    }
  }

  const unit = project.unit
  const activeSheet = result?.sheets[sheetIndex]

  return (
    <div className="page">
      <nav className="breadcrumbs">
        <Link to="/">Projects</Link>
        <span>/</span>
        <Link to={`/project/${project.id}`}>{project.name}</Link>
        <span>/</span>
        <span>Optimize</span>
      </nav>

      <header className="page-header">
        <div>
          <h1>Nesting layout</h1>
          <p className="lede muted">
            MaxRects packer with kerf · material-matched stock · rotation when allowed
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-primary" onClick={runOptimize}>
            {result ? 'Re-run optimize' : 'Run optimize'}
          </button>
          {result && result.sheets.length > 0 && (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  downloadText(
                    `${project.name}-layout.csv`,
                    exportLayoutCsv(result, unit),
                  )
                }
              >
                CSV layout
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => exportLayoutPdf(project, result, unit)}
              >
                PDF
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
                Print
              </button>
            </>
          )}
        </div>
      </header>

      {error && <p className="form-error panel">{error}</p>}

      {!result && (
        <div className="panel empty-state">
          <h2>Ready to nest</h2>
          <p>
            {items.reduce((s, i) => s + i.quantity, 0)} parts across {items.length} lines ·{' '}
            {stock.length} stock SKU{stock.length === 1 ? '' : 's'} · kerf{' '}
            {project.kerfMm} mm
          </p>
          <button type="button" className="btn btn-primary" onClick={runOptimize}>
            Run optimize
          </button>
        </div>
      )}

      {result && (
        <div className="optimize-results print-area">
          <div className="stats-row">
            <Stat label="Sheets" value={String(result.totalSheets)} />
            <Stat label="Parts placed" value={String(result.totalParts)} />
            <Stat label="Yield" value={`${result.yieldPercent.toFixed(1)}%`} />
            <Stat label="Waste" value={`${result.overallWastePercent.toFixed(1)}%`} />
          </div>

          {result.unplaced.length > 0 && (
            <div className="panel warn">
              <strong>Unplaced ({result.unplaced.length})</strong>
              <p>{result.unplaced.join(', ')}</p>
            </div>
          )}

          {result.sheets.length > 0 && (
            <>
              <div className="sheet-tabs">
                {result.sheets.map((s, i) => (
                  <button
                    key={s.sheetIndex}
                    type="button"
                    className={i === sheetIndex ? 'tab is-active' : 'tab'}
                    onClick={() => setSheetIndex(i)}
                  >
                    Sheet {s.sheetIndex}
                  </button>
                ))}
              </div>
              {activeSheet && (
                <div className="panel">
                  <LayoutPreview
                    sheet={activeSheet}
                    unit={unit}
                    highlightKey={highlight}
                    onSelectPiece={setHighlight}
                  />
                </div>
              )}
            </>
          )}

          <p className="algo-note">Algorithm: {result.algorithmUsed}</p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  )
}
