import { Link } from 'react-router-dom'

export function SettingsPage() {
  return (
    <div className="page">
      <nav className="breadcrumbs">
        <Link to="/">Projects</Link>
        <span>/</span>
        <span>Settings</span>
      </nav>

      <header className="page-header">
        <div>
          <p className="eyebrow">Preferences</p>
          <h1>Settings</h1>
          <p className="lede muted">
            Units are per project (mm / in / ft). Shop branding and offcuts are stored in this
            browser via localStorage.
          </p>
        </div>
      </header>

      <div className="panel">
        <ul className="bom-list">
          <li>
            <Link to="/shop">Shop profile</Link> — name, phone, address, logo for PDF headers
          </li>
          <li>
            <Link to="/offcuts">Offcut library</Link> — saved remnants from nesting
          </li>
          <li>
            Display units — open any project and use the mm / in / ft toggle
          </li>
          <li>
            Stock presets — available when adding stock sheets (Euro, NA, etc.)
          </li>
        </ul>
      </div>
    </div>
  )
}
