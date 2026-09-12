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

For normal use, run `uv run --project backend lumina` from the repository root.
FastAPI serves the built frontend and API together at <http://127.0.0.1:11000>.
The Vite development server remains available for frontend development and
proxies `/api` to `http://localhost:11000`.

The client expects:

- `GET /api/library/files`
- `GET /api/files/{id}`
- `GET /api/search?q=...`
- `GET /api/status`
- `POST /api/rescan`
- `GET /api/files/{id}/images?path=...` for backend-validated local image resolution

List/search responses may be either arrays or `{ "items": [...] }`. Backend failures and FastAPI
`detail` messages are shown directly in the relevant interface state.

## Source layout

- `lib/` — API client, Markdown rehype plugin, preferences, favorites/recents store,
  fuzzy matching, formatting helpers, lazy Prettier pretty-printing (`formatCode.ts`),
  and lazy Mermaid rendering (`mermaid.ts`)
- `hooks/` — library and search data, reading position and outline tracking, active
  theme tracking, and global keyboard shortcuts
- `components/` — sidebar, library list, topbar, reader, code block, Mermaid diagram,
  outline, settings panel, command palette, and shortcut sheet
- `styles/` — design tokens plus base, layout, sidebar, reader, Markdown, syntax,
  overlay, and print stylesheets, combined by `styles/index.css`
