from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from time import monotonic, sleep

import pytest
from fastapi.testclient import TestClient

from app.config import LibraryConfig
from app.main import create_app


def wait_until_idle(client: TestClient) -> dict[str, object]:
    deadline = monotonic() + 5
    while monotonic() < deadline:
        status = client.get("/api/status").json()
        if status["state"] != "scanning":
            return status
        sleep(0.01)
    raise AssertionError("scan did not finish")


@pytest.fixture
def library_root(tmp_path: Path) -> Path:
    root = tmp_path / "library"
    root.mkdir()
    (root / "guide.md").write_text(
        "# Welcome\n\nA searchable luminous phrase appears here.\n", encoding="utf-8"
    )
    (root / "cover.png").write_bytes(b"\x89PNG\r\n\x1a\n")
    nested = root / "notes"
    nested.mkdir()
    (nested / "daily.markdown").write_text("# Daily\nordinary notes", encoding="utf-8")
    return root


@pytest.fixture
def client(library_root: Path) -> Iterator[TestClient]:
    config = LibraryConfig(roots=(library_root.resolve(),))
    app = create_app(config, scan_on_start=False)
    with TestClient(app) as test_client:
        test_client.post("/api/rescan")
        wait_until_idle(test_client)
        yield test_client
