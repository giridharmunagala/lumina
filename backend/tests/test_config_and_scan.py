from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.config import LibraryConfig, default_roots
from app.main import create_app
from conftest import wait_until_idle


def test_default_roots_explicitly_include_copilot(tmp_path: Path) -> None:
    (tmp_path / "Documents").mkdir()
    (tmp_path / ".copilot").mkdir()
    assert default_roots(tmp_path) == [
        tmp_path.resolve(),
        (tmp_path / ".copilot").resolve(),
    ]


def test_scan_excludes_noise_but_traverses_explicit_dot_copilot(tmp_path: Path) -> None:
    copilot = tmp_path / ".copilot"
    copilot.mkdir()
    (copilot / "included.md").write_text("included", encoding="utf-8")
    (copilot / ".hidden").mkdir()
    (copilot / ".hidden" / "hidden.md").write_text("hidden", encoding="utf-8")
    (copilot / "node_modules").mkdir()
    (copilot / "node_modules" / "noise.md").write_text("noise", encoding="utf-8")

    app = create_app(LibraryConfig(roots=(copilot.resolve(),)), scan_on_start=False)
    with TestClient(app) as client:
        response = client.post("/api/rescan")
        assert response.status_code == 202
        wait_until_idle(client)
        listed = client.get("/api/library/files").json()

    assert [item["name"] for item in listed] == ["included.md"]


def test_status_and_config_update_are_nonblocking(tmp_path: Path) -> None:
    first = tmp_path / "first"
    second = tmp_path / "second"
    first.mkdir()
    second.mkdir()
    (second / "new.md").write_text("new", encoding="utf-8")
    app = create_app(LibraryConfig(roots=(first.resolve(),)), scan_on_start=False)

    with TestClient(app) as client:
        response = client.put("/api/config", json={"roots": [str(second)]})
        assert response.status_code == 200
        assert response.json()["roots"] == [str(second.resolve())]
        status = client.get("/api/status")
        assert status.status_code == 200
        assert status.json()["state"] in {"scanning", "idle"}
        final = wait_until_idle(client)
        assert final["state"] == "idle"
        assert final["indexed_files"] == 1
        assert final["generation"] == 1


def test_invalid_config_has_structured_error(client: TestClient) -> None:
    response = client.put("/api/config", json={"roots": ["/definitely/not/here"]})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_config"
