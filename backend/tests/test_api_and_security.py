from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from conftest import wait_until_idle


def test_frontend_is_served_by_the_app(tmp_path: Path) -> None:
    from app.config import LibraryConfig
    from app.main import create_app

    library_root = tmp_path / "library"
    library_root.mkdir()
    frontend_dist = tmp_path / "dist"
    frontend_dist.mkdir()
    (frontend_dist / "index.html").write_text(
        "<!doctype html><title>Lumina</title>", encoding="utf-8"
    )
    assets = frontend_dist / "assets"
    assets.mkdir()
    (assets / "app.js").write_text("console.log('Lumina')", encoding="utf-8")

    app = create_app(
        LibraryConfig(roots=(library_root,)),
        scan_on_start=False,
        frontend_dist=frontend_dist,
    )
    with TestClient(app) as frontend_client:
        assert frontend_client.get("/").text == "<!doctype html><title>Lumina</title>"
        assert frontend_client.get("/documents/example").status_code == 200
        assert frontend_client.get("/assets/app.js").text == "console.log('Lumina')"
        assert frontend_client.get("/api/status").headers["content-type"].startswith(
            "application/json"
        )


def test_listing_tree_and_explicit_content(client: TestClient) -> None:
    listing = client.get("/api/library/files")
    assert listing.status_code == 200
    assert {item["name"] for item in listing.json()} == {"guide.md", "daily.markdown"}
    assert all("content" not in item for item in listing.json())

    tree = client.get("/api/library/tree")
    assert tree.status_code == 200
    assert tree.json()[0]["type"] == "root"

    file_id = next(item["id"] for item in listing.json() if item["name"] == "guide.md")
    selected = client.get(f"/api/files/{file_id}")
    assert selected.status_code == 200
    assert "luminous phrase" in selected.json()["content"]


def test_filename_path_and_content_search(client: TestClient) -> None:
    by_name = client.get("/api/search", params={"q": "daily", "mode": "filename"})
    assert by_name.json()[0]["match_type"] == "filename"
    assert by_name.json()[0]["snippet"] is None

    by_path = client.get("/api/search", params={"q": "notes/", "mode": "path"})
    assert by_path.json()[0]["name"] == "daily.markdown"

    by_content = client.get(
        "/api/search", params={"q": "LUMINOUS PHRASE", "mode": "content"}
    )
    result = by_content.json()[0]
    assert result["match_type"] == "content"
    assert "luminous phrase" in result["snippet"]
    assert len(result["snippet"]) < 200


def test_images_are_relative_to_indexed_file_and_root(
    client: TestClient, library_root: Path, tmp_path: Path
) -> None:
    file_id = next(
        item["id"]
        for item in client.get("/api/library/files").json()
        if item["name"] == "guide.md"
    )
    image = client.get(f"/api/files/{file_id}/images", params={"path": "cover.png"})
    assert image.status_code == 200
    assert image.content.startswith(b"\x89PNG")

    outside = tmp_path / "secret.png"
    outside.write_bytes(b"secret")
    escaped = client.get(
        f"/api/files/{file_id}/images", params={"path": "../secret.png"}
    )
    assert escaped.status_code == 404
    assert escaped.json()["error"]["code"] == "image_not_found"

    arbitrary = client.get("/api/files/not-indexed")
    assert arbitrary.status_code == 404
    assert arbitrary.json()["error"]["code"] == "file_not_found"


def test_symlinked_markdown_and_image_escape_are_rejected(
    client: TestClient, library_root: Path, tmp_path: Path
) -> None:
    outside_md = tmp_path / "outside.md"
    outside_md.write_text("secret markdown", encoding="utf-8")
    (library_root / "linked.md").symlink_to(outside_md)
    client.post("/api/rescan")
    wait_until_idle(client)
    assert all(
        item["name"] != "linked.md" for item in client.get("/api/library/files").json()
    )

    outside_image = tmp_path / "outside.jpg"
    outside_image.write_bytes(b"secret image")
    (library_root / "linked.jpg").symlink_to(outside_image)
    file_id = next(
        item["id"]
        for item in client.get("/api/library/files").json()
        if item["name"] == "guide.md"
    )
    response = client.get(
        f"/api/files/{file_id}/images", params={"path": "linked.jpg"}
    )
    assert response.status_code == 404

    guide = library_root / "guide.md"
    guide.unlink()
    guide.symlink_to(outside_md)
    assert client.get(f"/api/files/{file_id}").status_code == 404


def test_validation_errors_are_structured(client: TestClient) -> None:
    response = client.get("/api/search", params={"q": ""})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
