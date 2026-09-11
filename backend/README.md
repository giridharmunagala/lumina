# Lumina Markdown backend

Run from this directory:

```bash
python -m venv .venv
.venv/bin/pip install -e '.[test]'
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Set `LUMINA_ALLOWED_ROOTS` to an OS-path-separator-delimited list to override the
default library roots. The defaults are existing `Documents`, `Desktop`,
`Downloads`, and `Markdown` directories, plus `~/.copilot` when present.

The API starts an index scan in the background. Use `/api/status`,
`POST /api/rescan`, and `/api/config` to inspect or update it. Interactive API
documentation is available at `/docs`.
