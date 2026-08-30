# DeadDrop frontend

React 19 + Vite UI for uploading a file and opening its share link.

## Development

From this directory:

```bash
copy .env.example .env
npm install
npm run dev
```

Vite listens on http://localhost:5173 and proxies `/api` to http://localhost:5000. Run the backend from the repo root (`npm run dev`) at the same time.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Axios base URL. Leave as `/api` for the Vite proxy and for same-origin production. Set an absolute URL only for a split-origin API (for example `https://api.example.com/api`). |

Vite only reads `frontend/.env`. The root `.env` is for the Express process.

## Scripts

```bash
npm run dev      # Vite dev server
npm test         # Vitest + Testing Library
npm run build    # tsc -b && vite build
npm run preview  # serve the production build
```

## Production

`npm run build` writes to `frontend/dist`. The Express app serves that directory when it exists, so Docker and `npm run build:all` are same-origin: the browser calls `/api` on the page host.

## Limits shown in the UI

These match the API: 10 MB maximum, JPEG/PNG/PDF/TXT/ZIP, expiry presets of 1 hour / 24 hours / 7 days, 1–100 downloads, optional password. Files are not encrypted.
