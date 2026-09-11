# Lumina frontend

A responsive, local-first Markdown library and reader built with React, TypeScript, and Vite.

## Commands

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

The Vite development server proxies `/api` to `http://localhost:8000`. The client expects:

- `GET /api/files`
- `GET /api/files/{id}`
- `GET /api/search?q=...`
- `GET /api/scan/status`
- `POST /api/scan`
- `GET /api/files/{id}/assets?path=...` for backend-validated local image resolution

List/search responses may be either arrays or `{ "items": [...] }`. Backend failures and FastAPI
`detail` messages are shown directly in the relevant interface state.
