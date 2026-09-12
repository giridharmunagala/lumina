from __future__ import annotations

import argparse
import shutil
import subprocess
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

import uvicorn


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND = PROJECT_ROOT / "frontend"
FRONTEND_DIST = FRONTEND / "dist"


def _latest_source_mtime() -> float:
    inputs = [
        FRONTEND / "index.html",
        FRONTEND / "package-lock.json",
        FRONTEND / "package.json",
        FRONTEND / "tsconfig.app.json",
        FRONTEND / "tsconfig.node.json",
        FRONTEND / "vite.config.ts",
        *FRONTEND.joinpath("src").rglob("*"),
    ]
    return max(path.stat().st_mtime for path in inputs if path.is_file())


def build_frontend() -> None:
    npm = shutil.which("npm")
    if npm is None:
        raise SystemExit("Node.js 20+ and npm are required to build the Lumina webpage.")

    if not (FRONTEND / "node_modules").is_dir():
        print("Installing webpage dependencies...")
        subprocess.run([npm, "ci"], cwd=FRONTEND, check=True)

    index = FRONTEND_DIST / "index.html"
    if not index.is_file() or index.stat().st_mtime < _latest_source_mtime():
        print("Building the Lumina webpage...")
        subprocess.run([npm, "run", "build"], cwd=FRONTEND, check=True)


def open_when_ready(url: str, open_browser: bool) -> None:
    for _ in range(100):
        try:
            with urllib.request.urlopen(f"{url}/api/status", timeout=1):
                break
        except (OSError, urllib.error.URLError):
            time.sleep(0.1)
    else:
        print(f"Lumina did not become ready. Check the server output below.")
        return

    print(f"Lumina is ready at {url}")
    if open_browser and not webbrowser.open(url):
        print("The browser could not be opened automatically. Open the URL above.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build and open Lumina.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=11000)
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="start Lumina without opening a browser",
    )
    args = parser.parse_args()

    build_frontend()
    url = f"http://{args.host}:{args.port}"
    threading.Thread(
        target=open_when_ready,
        args=(url, not args.no_browser),
        daemon=True,
    ).start()
    uvicorn.run("app.main:app", host=args.host, port=args.port)


if __name__ == "__main__":
    main()
