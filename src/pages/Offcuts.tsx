import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import * as store from '../storage/store'
import { formatSize } from '../domain/units'

export function OffcutsPage() {
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  const offcuts = data.offcuts
  const projects = data.projects

  return (
    <div className="page">
      <nav className="breadcrumbs">
        <Link to="/">Projects</Link>
        <span>/</span>
        <span>Offcut library</span>
      </nav>

      <header className="page-header">
        <div>
          <p className="eyebrow">Remnants</p>
          <h1>Offcut library</h1>
          <p className="lede muted">
            Leftovers saved from nesting layouts. Reuse as stock on any project.
          </p>
        </div>
      </header>

      {offcuts.length === 0 ? (
        <div className="panel empty-state">
          <h2>No offcuts saved</h2>
          <p>Run Optimize on a project, then save usable leftovers from the results.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Size</th>
                <th>Material</th>
                <th>From</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {offcuts.map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.label ||
                      `Offcut ${Math.round(o.lengthMm)}×${Math.round(o.widthMm)}`}
                  </td>
                  <td>{formatSize(o.lengthMm, o.widthMm, 'mm')}</td>
                  <td>{o.materialType}</td>
                  <td>
                    {o.sourceProjectName || '—'}
                    {o.fromSheetIndex ? ` · sheet ${o.fromSheetIndex}` : ''}
                  </td>
                  <td className="row-actions">
                    {projects[0] && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          const pid =
                            projects.find((p) => p.id === o.sourceProjectId)?.id ??
                            projects[0].id
                          store.addOffcutAsStock(o.id, pid)
                          alert(`Added to stock on “${projects.find((p) => p.id === pid)?.name}”`)
                        }}
                      >
                        Use as stock
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger-ghost btn-sm"
                      onClick={() => store.deleteOffcut(o.id)}
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
    </div>
  )
}
