import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as store from '../storage/store'

const MAX_LOGO_BYTES = 400_000

export function ShopProfilePage() {
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  const shop = data.shopProfile
  const [savedFlash, setSavedFlash] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1600)
  }

  function onLogo(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file')
      return
    }
    if (file.size > MAX_LOGO_BYTES * 2) {
      alert('Logo too large — use a smaller image (under ~400 KB preferred)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      // Soft compress via canvas if oversized
      if (dataUrl.length > MAX_LOGO_BYTES) {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const max = 320
          const scale = Math.min(1, max / Math.max(img.width, img.height))
          canvas.width = Math.max(1, Math.round(img.width * scale))
          canvas.height = Math.max(1, Math.round(img.height * scale))
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            store.updateShopProfile({ logoDataUrl: dataUrl })
            return
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          store.updateShopProfile({ logoDataUrl: canvas.toDataURL('image/jpeg', 0.82) })
        }
        img.src = dataUrl
      } else {
        store.updateShopProfile({ logoDataUrl: dataUrl })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="page">
      <nav className="breadcrumbs">
        <Link to="/">Projects</Link>
        <span>/</span>
        <span>Shop profile</span>
      </nav>

      <header className="page-header">
        <div>
          <p className="eyebrow">Branding</p>
          <h1>Shop profile</h1>
          <p className="lede muted">Shown on PDF headers for layouts and part labels.</p>
        </div>
      </header>

      <form className="panel form-grid" onSubmit={onSubmit}>
        <label>
          Shop name
          <input
            value={shop.shopName}
            onChange={(e) => store.updateShopProfile({ shopName: e.target.value })}
            placeholder="Acme Cabinets"
          />
        </label>
        <label>
          Phone
          <input
            value={shop.phone}
            onChange={(e) => store.updateShopProfile({ phone: e.target.value })}
            placeholder="+1 …"
          />
        </label>
        <label className="grow" style={{ gridColumn: '1 / -1' }}>
          Address
          <input
            value={shop.address}
            onChange={(e) => store.updateShopProfile({ address: e.target.value })}
            placeholder="Street, city"
          />
        </label>

        <div className="logo-block" style={{ gridColumn: '1 / -1' }}>
          <p className="section-head" style={{ marginBottom: '0.5rem' }}>
            <span>Logo</span>
          </p>
          {shop.logoDataUrl ? (
            <div className="logo-preview-row">
              <img src={shop.logoDataUrl} alt="Shop logo" className="logo-preview" />
              <button
                type="button"
                className="btn btn-danger-ghost"
                onClick={() => store.updateShopProfile({ logoDataUrl: '' })}
              >
                Remove logo
              </button>
            </div>
          ) : (
            <p className="empty-inline">No logo yet</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onLogo(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileRef.current?.click()}
          >
            Upload logo
          </button>
        </div>

        <div className="form-actions">
          {savedFlash && <span className="saved-flash">Saved in this browser</span>}
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
