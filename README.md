# AnyCut Web

Browser cut-list and sheet-nesting app (Vite + React + TypeScript). Data stays in **localStorage** — no backend required.

Live target: **https://anycut.muhammadwaqaskhan.com**

## Local development

```bash
cd E:\AnycutWeb
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Production build / preview:

```bash
npm run build
npm run preview
```

Build output is `dist/` (static files for Cloudflare Pages).

## Features (MVP)

- Projects dashboard (create / open / delete)
- Cut list CRUD with material, qty, rotation / grain lock
- Stock sheets with size presets (Euro 2440×1220, 4×8 ft, etc.)
- Units: mm / in / ft (stored as mm)
- MaxRects nesting with kerf and material matching
- SVG layout preview
- Export cut list CSV, layout CSV, PDF (jsPDF), and browser print

## Cloudflare Pages deploy

### Option A — Dashboard (Git connected)

1. Push this repo to GitHub/GitLab.
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → connect the repo.
3. Build settings:
   - **Framework preset:** Vite (or None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (repo root)
4. Deploy. You’ll get a `*.pages.dev` URL.

### Option B — Wrangler CLI

```bash
npm run build
npx wrangler pages deploy dist --project-name=anycut-web
```

`wrangler.toml` sets `pages_build_output_dir = "dist"`.

### Custom domain: anycut.muhammadwaqaskhan.com

Parent zone `muhammadwaqaskhan.com` must already be on Cloudflare.

1. In the Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter `anycut.muhammadwaqaskhan.com`.
3. Cloudflare will add a **CNAME** (or proxy record) for `anycut` → your Pages project (`anycut-web.pages.dev` or similar).
4. If managing DNS manually under the zone:
   - **Type:** CNAME  
   - **Name:** `anycut`  
   - **Target:** `<your-project>.pages.dev`  
   - **Proxy status:** Proxied (orange cloud)
5. Wait for SSL (usually automatic via Cloudflare). Visit `https://anycut.muhammadwaqaskhan.com`.

SPA client routes use `public/_redirects`:

```
/*    /index.html   200
```

so `/project/:id` and `/project/:id/optimize` work on refresh.

## Project layout

```
src/
  domain/     units, stock presets, MaxRects optimizer
  storage/    localStorage persistence
  export/     CSV + PDF helpers
  pages/      Dashboard, ProjectDetail, Optimize
  components/ LayoutPreview (SVG)
```

## Notes

- Ported concepts from the Android AnyCut app (`com.anycut.cutlist`); this web MVP is standalone TypeScript.
- Clearing site data / another browser = empty projects (local only).
