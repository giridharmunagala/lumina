# Lumina Markdown backend

From the repository root, start the complete app with:

```bash
uv run --project backend lumina
```

This builds the frontend when needed, serves it with the API at
<http://127.0.0.1:11000>, and opens it in your browser.

Set `LUMINA_ALLOWED_ROOTS` to an OS-path-separator-delimited list to override the
default library roots. By default the current user's home directory is indexed,
plus `~/.copilot` when present.

Indexed documents carry a title (front matter `title`, otherwise the first
heading, otherwise the file stem), tags, and a word count; front matter is
stripped from the content returned to the reader. Search results are ranked by
match type, match count, and recency before the `limit` is applied.

The API starts an index scan in the background. Use `/api/status`,
`POST /api/rescan`, and `/api/config` to inspect or update it. Interactive API
documentation is available at `/docs`.
