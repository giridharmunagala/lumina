from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.config import LibraryConfig
from app.documents import describe, parse_front_matter
from app.main import create_app
from conftest import wait_until_idle


def test_front_matter_is_parsed_and_removed_from_the_body() -> None:
    text = (
        "---\n"
        "title: Release Notes\n"
        "tags:\n"
        "  - release\n"
        "  - notes\n"
        "draft: false\n"
        "---\n"
        "# Ignored heading\n\nBody text here.\n"
    )
    data, body = parse_front_matter(text)
    assert data["title"] == "Release Notes"
    assert data["tags"] == ["release", "notes"]
    assert body.startswith("# Ignored heading")

    info = describe(text)
    assert info.title == "Release Notes"
    assert info.tags == ("release", "notes")
    assert "---" not in info.body
    assert info.word_count == 5


def test_titles_fall_back_to_headings_then_file_stem() -> None:
    assert describe("```\n# fenced\n```\n\n## Not h1\n\n# Real Title\n").title == "Real Title"
    assert describe("Setext Title\n===\n\ntext").title == "Setext Title"
    assert describe("no headings at all", fallback_title="my-note").title == "my-note"
    assert describe("# `code` and [link](x) **bold**").title == "code and link bold"
    assert describe("---\ntags: [a, b]\n---\n# H", fallback_title="f").tags == ("a", "b")


def test_metadata_is_exposed_through_the_api(tmp_path: Path) -> None:
    root = tmp_path / "library"
    root.mkdir()
    (root / "note.md").write_text(
        "---\ntitle: Indexed Note\ntags: [alpha, beta]\n---\n\nOne two three four.\n",
        encoding="utf-8",
    )
    app = create_app(LibraryConfig(roots=(root.resolve(),)), scan_on_start=False)
    with TestClient(app) as client:
        client.post("/api/rescan")
        wait_until_idle(client)
        listed = client.get("/api/library/files").json()[0]
        assert listed["title"] == "Indexed Note"
        assert listed["tags"] == ["alpha", "beta"]
        assert listed["word_count"] == 4
        assert listed["created_at"]

        document = client.get(f"/api/files/{listed['id']}").json()
        assert document["content"].strip() == "One two three four."
        assert document["title"] == "Indexed Note"


def test_search_results_are_ranked_and_limited(tmp_path: Path) -> None:
    root = tmp_path / "library"
    (root / "deep").mkdir(parents=True)
    (root / "alpha.md").write_text("# Alpha\nunrelated body", encoding="utf-8")
    (root / "deep" / "mentions-alpha.md").write_text(
        "# Mentions\nalpha appears twice: alpha", encoding="utf-8"
    )
    (root / "notes.md").write_text("# Notes\nalpha once", encoding="utf-8")

    app = create_app(LibraryConfig(roots=(root.resolve(),)), scan_on_start=False)
    with TestClient(app) as client:
        client.post("/api/rescan")
        wait_until_idle(client)
        results = client.get("/api/search", params={"q": "alpha"}).json()
        assert [item["name"] for item in results[:2]] == [
            "alpha.md",
            "mentions-alpha.md",
        ]
        assert results[0]["match_type"] == "filename"
        assert results[-1]["match_type"] == "content"
        assert results[-1]["matches"] >= 1
        assert client.get("/api/search", params={"q": "alpha", "limit": 1}).json() == [
            results[0]
        ]
