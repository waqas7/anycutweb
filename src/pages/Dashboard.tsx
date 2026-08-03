import { useSyncExternalStore, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as store from '../storage/store'

export function Dashboard() {
  const navigate = useNavigate()
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  const [name, setName] = useState('')
  const [showForm, setShowForm] = useState(false)

  function onCreate(e: FormEvent) {
    e.preventDefault()
    const project = store.createProject(name)
    setName('')
    setShowForm(false)
    navigate(`/project/${project.id}`)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Shop cut lists</p>
          <h1 className="brand">AnyCut</h1>
          <p className="lede">
            Nest parts on stock sheets, track kerf, export CSV & PDF — all in the browser.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          New project
        </button>
      </header>

      {showForm && (
        <form className="panel form-row" onSubmit={onCreate}>
          <label>
            Project name
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kitchen carcass / shelf set…"
            />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      )}

      {data.projects.length === 0 ? (
        <div className="empty-state panel">
          <h2>No projects yet</h2>
          <p>Create a project to add cut pieces and stock sheets, then run Optimize.</p>
        </div>
      ) : (
        <ul className="project-list">
          {data.projects.map((p) => {
            const parts = data.cutItems.filter((c) => c.projectId === p.id)
            const qty = parts.reduce((s, c) => s + c.quantity, 0)
            return (
              <li key={p.id} className="project-card">
                <Link to={`/project/${p.id}`} className="project-card__main">
                  <h2>{p.name}</h2>
                  <p>
                    {qty} part{qty === 1 ? '' : 's'} · {parts.length} line
                    {parts.length === 1 ? '' : 's'} · updated{' '}
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
                <button
                  type="button"
                  className="btn btn-danger-ghost"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => {
                    if (confirm(`Delete “${p.name}” and all its cuts/stock?`)) {
                      store.deleteProject(p.id)
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
