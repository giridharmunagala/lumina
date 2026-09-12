# Lumina

Lumina is a polished, local-first Markdown library and reader. A FastAPI service
indexes Markdown metadata and searchable text on your machine; a React frontend
provides an accessible library, full-text search, document outline, rich
GitHub-flavored Markdown rendering, and persistent reading preferences.

## Features

### Library

- Background, recursive indexing with ranked filename, title, path, and content search
- Front matter aware: document titles, tags, and word counts are indexed
- All / Recent / Starred views, folder grouping, and sorting by date, title, or path
- Command palette (`Ctrl`/`Cmd` + `K`) for fuzzy jump-to-document and commands
- Query highlighting in titles, paths, and content snippets
- Explicit support for GitHub Copilot data under `~/.copilot`

### Reading

- GitHub-flavored Markdown: tables, task lists, footnotes, and `<mark>` highlights
- GitHub-style callouts (`> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`)
- Syntax-highlighted code blocks with a language label, line-wrap toggle, and one-click copy
- One-click pretty-printing for JSON, JS/TS, CSS, HTML, YAML, Markdown, and GraphQL blocks
- Mermaid diagrams rendered from ```mermaid fences, with theme-aware colors, a source
  toggle, full-screen preview, and SVG export
- KaTeX math, remote and root-confined local images, and linkable heading anchors
- Live outline with scroll-spy highlighting plus a reading-progress indicator
- Focus mode, print / save-as-PDF styling, and restore of the last document opened

### Appearance

- Seven themes: match system, Midnight, Daylight, Sepia, Nord, and both Solarized
  variants, with syntax highlighting that follows the active palette
- Adjustable typeface, font size, line height, content width, justification, and a
  collapsible, resizable sidebar, all persisted in the browser
- Responsive layout, keyboard navigation, visible focus states, live loading and
  scanning feedback, empty states, and actionable backend errors

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Ctrl`/`Cmd` + `K` | Command palette |
| `/` | Focus library search |
| `↑` `↓` `Enter` | Move through results and open |
| `B` / `O` | Toggle the library / outline |
| `F` | Focus mode |
| `T` | Switch between light and dark |
| `S` | Star or unstar the open document |
| `R` | Rescan the library |
| `?` | Shortcut reference |
| `Esc` | Close dialogs and clear search |

## Start Lumina

- Python 3.11+
- Node.js 20+
- [`uv`](https://docs.astral.sh/uv/) (recommended) or `pip`

Run one command from the repository:

```bash
uv run --project backend lumina
```

Lumina installs and builds the webpage when needed, starts the local service, and
opens <http://127.0.0.1:11000> in your browser. The API and webpage use the same
server, so there is no second process or terminal. Pass `--no-browser` when you
only want the server.

## Configuration

By default Lumina indexes the current user's home directory and separately
indexes `~/.copilot` when it exists. The separate Copilot root intentionally
allows sessions and caches to be found even though hidden directories are
otherwise skipped. Common noisy, dependency, VCS, cache, virtual filesystem,
and operating-system directories are excluded.

Override roots before starting the API with an OS-path-separator-delimited list:

```bash
LUMINA_ALLOWED_ROOTS="$HOME/Documents:$HOME/notes:$HOME/.copilot" \
  uv run --project backend uvicorn app.main:app --host 127.0.0.1 --port 11000
```

On Windows, delimit roots with `;`. Runtime configuration is available through
`GET /api/config` and `PUT /api/config`; changing it triggers a background
rescan. API documentation is at <http://127.0.0.1:11000/docs>.

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
  Search covers titles, names, relative paths, and file text, ranked by relevance.
- Press `Ctrl`/`Cmd` + `K` to jump to any document or run a command.
- Star documents to pin them under **Starred**; opened documents collect under **Recent**.
- Use the refresh button to rescan; the UI remains responsive while indexing.
- Use the settings button to select a theme and tune typography and layout.
- Use the outline beside a document to jump between headings; it follows your scrolling.

## Project layout

```
backend/app/      config, documents (front matter), library index, models, FastAPI app
frontend/src/
  lib/            API client, Markdown plugin, preferences, local store, formatting
  hooks/          library/search data, reading position, keyboard shortcuts
  components/     sidebar, reader, outline, topbar, palette, dialogs
  styles/         tokens, base, layout, sidebar, reader, markdown, syntax, overlays, print
```

## Validation

```bash
uv run --project backend --extra test pytest backend/tests -q
cd frontend
npm test -- --run
npm run lint
npm run build
```

Backend tests cover root configuration, exclusions, explicit `.copilot`
inclusion, front matter parsing, ranked search, asynchronous scans, API errors,
traversal, symlinks, and indexed-file/image access. Frontend tests cover
preferences, formatting, the favorites/recents store, fuzzy matching, Markdown
URL rewriting, API error handling, and document rendering including callouts,
heading anchors, code blocks, and HTML sanitization.
