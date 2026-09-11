# Lumina

Lumina is a polished, local-first Markdown library and reader. A FastAPI service
indexes Markdown metadata and searchable text on your machine; a React frontend
provides an accessible library, full-text search, document outline, rich
GitHub-flavored Markdown rendering, and persistent reading preferences.

## Features

- Background, recursive indexing with filename, path, and contextual content search
- Explicit support for GitHub Copilot data under `~/.copilot`
- Safe, ID-based document reads and root-confined relative image resolution
- Sanitized inline/block HTML, GFM tables and task lists, footnotes, highlighted
  code, remote/local images, `<mark>` highlights, and KaTeX math
- Dark, light, Solarized Dark, and Solarized Light themes
- Adjustable typeface, font size, line height, content width, and collapsible,
  resizable sidebar, persisted in the browser
- Responsive layout, keyboard navigation, visible focus states, live loading and
  scanning feedback, empty states, and actionable backend errors

## Requirements and setup

- Python 3.11+
- Node.js 20+
- [`uv`](https://docs.astral.sh/uv/) (recommended) or `pip`

Start the API:

```bash
uv sync --project backend --extra test
uv run --project backend uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal, start the UI:

```bash
cd frontend
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>. Vite proxies `/api` to the API on port 8000.
For a production frontend bundle, run `npm run build` and serve `frontend/dist`
from a local static server alongside the API.

## Configuration

By default Lumina indexes the current user's home directory and separately
indexes `~/.copilot` when it exists. The separate Copilot root intentionally
allows sessions and caches to be found even though hidden directories are
otherwise skipped. Common noisy, dependency, VCS, cache, virtual filesystem,
and operating-system directories are excluded.

Override roots before starting the API with an OS-path-separator-delimited list:

```bash
LUMINA_ALLOWED_ROOTS="$HOME/Documents:$HOME/notes:$HOME/.copilot" \
  uv run --project backend uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On Windows, delimit roots with `;`. Runtime configuration is available through
`GET /api/config` and `PUT /api/config`; changing it triggers a background
rescan. API documentation is at <http://127.0.0.1:8000/docs>.

## Permissions and security model

Lumina runs entirely on your computer and binds to loopback in the documented
commands. It only has the filesystem permissions of the account that starts it.
Use narrow roots if your home directory contains Markdown that should not be
indexed.

Library responses contain metadata only. Document bodies are returned only when
the UI explicitly requests an indexed opaque file ID; search returns only short
context snippets. Arbitrary paths are never accepted for document reads.
Relative images are resolved from an indexed document, canonicalized, restricted
to an allowed root and image extension, and rejected on traversal or symlink
escape. Markdown HTML is sanitized in the browser before rendering. Do not
expose the API to a network or untrusted browser origins.

## Usage

- Press `/` to focus library search, then use arrow keys and Enter to open a result.
- Search covers names, relative paths, and file text.
- Use the refresh button to rescan; the UI remains responsive while indexing.
- Use the settings button to select a theme and tune typography/layout.
- Use the outline beside a document to jump between headings.

## Validation

```bash
uv run --project backend --extra test pytest backend/tests -q
cd frontend
npm test -- --run
npm run lint
npm run build
```

Backend tests cover root configuration, exclusions, explicit `.copilot`
inclusion, search, asynchronous scans, API errors, traversal, symlinks, and
indexed-file/image access. Frontend tests cover preferences, Markdown URL
rewriting, API error handling, and backend-to-UI contract mapping.
