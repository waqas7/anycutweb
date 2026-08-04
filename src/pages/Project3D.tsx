import { useMemo, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as store from '../storage/store'
import {
  buildCabinetAssembly,
  looksLikeTemplateCarcass,
} from '../domain/cabinetAssembly'
import { ExplodedCabinetPreview } from '../components/ExplodedCabinetPreview'
import { formatCompact } from '../domain/units'

export function Project3DPage() {
  const { id = '' } = useParams()
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  const project = data.projects.find((p) => p.id === id)
  const items = useMemo(
    () => data.cutItems.filter((c) => c.projectId === id),
    [data.cutItems, id],
  )

  const assembly = useMemo(() => buildCabinetAssembly(items), [items])
  const canPreview = looksLikeTemplateCarcass(items) && assembly.panels.length > 0
  const unit = project?.unit ?? 'mm'

  if (!project) {
    return (
      <div className="page">
        <p>Project not found.</p>
        <Link to="/">Back</Link>
      </div>
    )
  }

  const outer =
    assembly.outerWidthMm != null &&
    assembly.outerHeightMm != null &&
    assembly.outerDepthMm != null
      ? `${formatCompact(assembly.outerWidthMm, unit)} × ${formatCompact(assembly.outerHeightMm, unit)} × ${formatCompact(assembly.outerDepthMm, unit)} ${unit}`
      : null

  const tall =
    (assembly.outerHeightMm ?? 0) > 1200 ||
    items.some((i) => /pantry|wardrobe|bookcase/i.test(i.label))
  const narrow = (assembly.outerWidthMm ?? 600) < 450
  const wide = (assembly.outerWidthMm ?? 0) >= 900

  return (
    <div className="page">
      <nav className="breadcrumbs">
        <Link to="/">Projects</Link>
        <span>/</span>
        <Link to={`/project/${project.id}`}>{project.name}</Link>
        <span>/</span>
        <span>3D</span>
      </nav>

      <header className="page-header">
        <div>
          <h1>3D preview</h1>
          <p className="lede muted">
            Isometric explode / assemble from part roles
            {outer ? ` · ~${outer}` : ''}
          </p>
        </div>
        <Link className="btn btn-ghost" to={`/project/${project.id}`}>
          Back to project
        </Link>
      </header>

      {!canPreview ? (
        <div className="panel empty-state">
          <h2>Not enough carcass roles</h2>
          <p>
            Assign at least two sides plus two of top / bottom / back (via Role on each
            part, or labels like “Left side”, “Top”, “Bottom”).
          </p>
          {assembly.unmappedLabels.length > 0 && (
            <p className="muted">Unmapped: {assembly.unmappedLabels.join(', ')}</p>
          )}
        </div>
      ) : (
        <div className="panel">
          <ExplodedCabinetPreview
            panels={assembly.panels}
            tall={tall}
            narrow={narrow}
            wide={wide}
          />
          {assembly.unmappedLabels.length > 0 && (
            <p className="algo-note" style={{ marginTop: '1rem' }}>
              Skipped in 3D: {assembly.unmappedLabels.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
