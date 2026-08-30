# DeadDrop

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-000000?logo=express&logoColor=white)

Anonymous file drops with expiring links, optional passwords, and download limits. Files are stored on disk; metadata lives in SQLite. There is no end-to-end encryption — anyone with the link (and password, if set) can download the file until it expires or the download limit is reached.

## Features

- Anonymous uploads with UUIDv4 download links
- Expiry of 1 minute to 7 days (UI presets: 1 hour, 24 hours, 7 days)
- Download limit of 1–100 per file
- Optional password, hashed with bcrypt (never stored in plaintext)
- Upload cap of 10 MB; allowed types: JPEG, PNG, PDF, TXT, ZIP
- Magic-byte checks so the declared MIME type must match the file contents
- Automatic cleanup of expired or exhausted files every 5 minutes
- Rate limits, Helmet headers, and CORS restricted to the configured origin
- Same-origin SPA serving in production when `frontend/dist` is present

## Tech stack

- Frontend: React 19, TypeScript, Vite, React Router, Axios, Tailwind, Framer Motion, GSAP
- Backend: Node.js 20, Express 5, TypeScript, Multer, bcrypt, node-cron, Helmet, express-rate-limit
- Database: SQLite via better-sqlite3 (no external database server)

## Prerequisites

- Node.js 20
- npm 9 or higher

## Local setup

```bash
git clone https://github.com/isthatpratham/DeadDrop.git
cd DeadDrop
copy .env.example .env
npm install
npm run dev
```

The API listens on http://localhost:5000 by default.

In a second terminal:

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Vite serves the UI on http://localhost:5173 and proxies `/api` to http://localhost:5000.

Health and readiness:

- `GET /api/health` — process is up
- `GET /api/ready` — SQLite is reachable and the upload directory is writable

## Environment variables

Copy `.env.example` for the backend. Every variable the process reads is listed there.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | HTTP listen port |
| `NODE_ENV` | `development` | Runtime mode |
| `TRUST_PROXY` | `1` | Express trust-proxy setting for correct client IPs |
| `CORS_ORIGIN` | `http://localhost:5173` in non-production; same-origin only in production | Allowed browser origins (`*`, `false`, or comma-separated list) |
| `SQLITE_PATH` | `backend/database/deaddrop.db` | SQLite file path |
| `UPLOAD_DIR` | `uploads` | Stored file directory |
| `RATE_LIMIT_API_MAX` / `_WINDOW_MS` | `100` / `900000` | All `/api` routes: 100 requests per 15 minutes per IP |
| `RATE_LIMIT_UPLOAD_MAX` / `_WINDOW_MS` | `20` / `3600000` | Uploads: 20 per hour per IP |
| `RATE_LIMIT_DOWNLOAD_MAX` / `_WINDOW_MS` | `10` / `900000` | Downloads: 10 per 15 minutes per IP |

The Vite app reads `VITE_API_BASE_URL` from `frontend/.env` (default `/api`). Set it only for a split-origin deployment.

## API

- `POST /api/upload` — multipart field `file`; optional `expiryMinutes`, `maxDownloads`, `password`
- `GET /api/file/:id/info` — public metadata (original name, size, expiry, remaining downloads, whether a password is required)
- `GET /api/download/:id` — download an unprotected file
- `POST /api/download/:id` — JSON body `{ "password": "..." }` for password-protected files. Query-string passwords are ignored.

## Docker

```bash
docker compose up --build
```

The image is `node:20-bookworm-slim`. Named volumes persist SQLite and uploads. Compose sets `TRUST_PROXY=1` and does not open CORS. Production CORS defaults to same-origin.

## Tests

```bash
npm test
npm run build
npm --prefix frontend test
npm --prefix frontend run build
```

CI on GitHub Actions runs the same commands on Node 20.

## Security notes

- Passwords are hashed with bcrypt; they are never accepted from the query string
- Download slots are reserved in SQLite before the file is streamed; a failed transfer still consumes a slot
- Files are not encrypted at rest or in transit beyond whatever TLS your reverse proxy provides
- Rate limits are per IP; set `TRUST_PROXY` correctly behind a load balancer or they can be bypassed or over-applied

## Project structure

```
DeadDrop/
├── backend/database/     SQLite setup and on-disk database
├── docker/               Container entrypoint
├── frontend/             Vite + React app
├── src/                  Express API
├── uploads/              Stored files (gitignored)
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Contributing

1. Fork the repository
2. Open a feature branch
3. Push and open a pull request

Recommended before submitting:

```bash
npm test
npm run build
npm --prefix frontend test
npm --prefix frontend run build
```

## License

MIT. See [LICENSE](LICENSE).

## Author

[Pratham](https://github.com/isthatpratham)
