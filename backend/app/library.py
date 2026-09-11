from __future__ import annotations

import asyncio
import hashlib
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Literal

from .config import LibraryConfig
from .models import FileContent, FileMetadata, SearchResult, StatusResponse, TreeNode


MARKDOWN_SUFFIXES = frozenset({".md", ".markdown", ".mdown", ".mkd"})
IMAGE_SUFFIXES = frozenset(
    {".avif", ".bmp", ".gif", ".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp"}
)


@dataclass(frozen=True, slots=True)
class IndexedFile:
    metadata: FileMetadata
    path: Path
    root_path: Path
    content: str
    folded_name: str
    folded_relative_path: str
    folded_content: str


def _is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


class LibraryIndex:
    def __init__(self, config: LibraryConfig) -> None:
        self.config = config
        self._files: dict[str, IndexedFile] = {}
        self._lock = RLock()
        self._task_lock = asyncio.Lock()
        self._scan_task: asyncio.Task[None] | None = None
        self._rescan_requested = False
        self._state: Literal["idle", "scanning", "error"] = "idle"
        self._started_at: datetime | None = None
        self._completed_at: datetime | None = None
        self._error: str | None = None
        self._generation = 0

    def status(self) -> StatusResponse:
        with self._lock:
            return StatusResponse(
                state=self._state,
                indexed_files=len(self._files),
                started_at=self._started_at,
                completed_at=self._completed_at,
                error=self._error,
                generation=self._generation,
            )

    async def request_scan(self, *, queue_if_running: bool = False) -> bool:
        async with self._task_lock:
            if self._scan_task is not None and not self._scan_task.done():
                if queue_if_running:
                    self._rescan_requested = True
                return False
            with self._lock:
                self._state = "scanning"
                self._started_at = datetime.now(timezone.utc)
                self._error = None
            self._scan_task = asyncio.create_task(self._run_scan())
            return True

    async def wait_for_scan(self) -> None:
        task = self._scan_task
        if task is not None:
            await task

    async def _run_scan(self) -> None:
        try:
            files = await asyncio.to_thread(self._scan_sync)
        except Exception as exc:
            with self._lock:
                self._state = "error"
                self._error = f"{type(exc).__name__}: {exc}"
                self._completed_at = datetime.now(timezone.utc)
        else:
            with self._lock:
                self._files = files
                self._state = "idle"
                self._completed_at = datetime.now(timezone.utc)
                self._generation += 1
        async with self._task_lock:
            if self._rescan_requested:
                self._rescan_requested = False
                with self._lock:
                    self._state = "scanning"
                    self._started_at = datetime.now(timezone.utc)
                    self._error = None
                self._scan_task = asyncio.create_task(self._run_scan())

    def _scan_sync(self) -> dict[str, IndexedFile]:
        roots, excluded_names, max_bytes = self.config.snapshot()
        found: dict[str, IndexedFile] = {}
        for root in roots:
            for directory, dirnames, filenames in os.walk(
                root, topdown=True, followlinks=False
            ):
                current = Path(directory)
                dirnames[:] = [
                    name
                    for name in dirnames
                    if name.casefold() not in excluded_names
                    and not name.startswith(".")
                    and not (current / name).is_symlink()
                ]
                for filename in filenames:
                    path = current / filename
                    if path.suffix.casefold() not in MARKDOWN_SUFFIXES or path.is_symlink():
                        continue
                    try:
                        resolved = path.resolve(strict=True)
                        if not _is_relative_to(resolved, root):
                            continue
                        stat = resolved.stat()
                        if not resolved.is_file() or stat.st_size > max_bytes:
                            continue
                        content = resolved.read_text(encoding="utf-8", errors="replace")
                    except (OSError, PermissionError):
                        continue
                    file_id = hashlib.sha256(str(resolved).encode()).hexdigest()[:24]
                    relative = resolved.relative_to(root).as_posix()
                    metadata = FileMetadata(
                        id=file_id,
                        name=resolved.name,
                        relative_path=relative,
                        root=str(root),
                        size=stat.st_size,
                        modified_at=datetime.fromtimestamp(
                            stat.st_mtime, tz=timezone.utc
                        ),
                    )
                    found[file_id] = IndexedFile(
                        metadata=metadata,
                        path=resolved,
                        root_path=root,
                        content=content,
                        folded_name=resolved.name.casefold(),
                        folded_relative_path=relative.casefold(),
                        folded_content=content.casefold(),
                    )
        return found

    def list_files(self) -> list[FileMetadata]:
        with self._lock:
            files = [item.metadata for item in self._files.values()]
        return sorted(
            files, key=lambda item: (item.root.casefold(), item.relative_path.casefold())
        )

    def get_indexed(self, file_id: str) -> IndexedFile | None:
        with self._lock:
            return self._files.get(file_id)

    def read_file(self, file_id: str) -> FileContent | None:
        item = self.get_indexed(file_id)
        if item is None or not self._still_safe(item):
            return None
        try:
            content = item.path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return None
        return FileContent(**item.metadata.model_dump(), content=content)

    @staticmethod
    def _still_safe(item: IndexedFile) -> bool:
        try:
            resolved = item.path.resolve(strict=True)
        except OSError:
            return False
        return (
            resolved == item.path
            and resolved.is_file()
            and _is_relative_to(resolved, item.root_path)
            and resolved.suffix.casefold() in MARKDOWN_SUFFIXES
        )

    def resolve_image(self, file_id: str, relative_path: str) -> Path | None:
        item = self.get_indexed(file_id)
        if item is None or not self._still_safe(item):
            return None
        supplied = Path(relative_path)
        if not relative_path or supplied.is_absolute():
            return None
        try:
            resolved = (item.path.parent / supplied).resolve(strict=True)
        except OSError:
            return None
        if (
            not resolved.is_file()
            or resolved.suffix.casefold() not in IMAGE_SUFFIXES
            or not _is_relative_to(resolved, item.root_path)
        ):
            return None
        return resolved

    def search(
        self,
        query: str,
        mode: Literal["all", "filename", "path", "content"],
        limit: int,
    ) -> list[SearchResult]:
        needle = query.casefold().strip()
        if not needle:
            return []
        with self._lock:
            files = tuple(self._files.values())
        results: list[SearchResult] = []
        for item in files:
            match_type: Literal["filename", "path", "content"] | None = None
            snippet: str | None = None
            if mode in ("all", "filename") and needle in item.folded_name:
                match_type = "filename"
            elif mode in ("all", "path") and needle in item.folded_relative_path:
                match_type = "path"
            elif mode in ("all", "content") and needle in item.folded_content:
                match_type = "content"
                snippet = self._snippet(item.content, item.folded_content.find(needle), len(needle))
            if match_type is not None:
                results.append(
                    SearchResult(
                        **item.metadata.model_dump(),
                        match_type=match_type,
                        snippet=snippet,
                    )
                )
                if len(results) >= limit:
                    break
        return results

    @staticmethod
    def _snippet(content: str, position: int, needle_length: int) -> str:
        start = max(0, position - 70)
        end = min(len(content), position + needle_length + 70)
        snippet = content[start:end].replace("\r", " ").replace("\n", " ").strip()
        if start:
            snippet = "…" + snippet
        if end < len(content):
            snippet += "…"
        return snippet

    def tree(self) -> list[TreeNode]:
        grouped: dict[str, list[FileMetadata]] = {}
        for item in self.list_files():
            grouped.setdefault(item.root, []).append(item)
        return [self._root_tree(root, files) for root, files in grouped.items()]

    @staticmethod
    def _root_tree(root: str, files: list[FileMetadata]) -> TreeNode:
        root_node = TreeNode(name=Path(root).name or root, path=root, type="root")
        for metadata in files:
            current = root_node
            parts = Path(metadata.relative_path).parts
            accumulated: list[str] = []
            for part in parts[:-1]:
                accumulated.append(part)
                child = next(
                    (
                        node
                        for node in current.children
                        if node.type == "directory" and node.name == part
                    ),
                    None,
                )
                if child is None:
                    child = TreeNode(
                        name=part,
                        path="/".join(accumulated),
                        type="directory",
                    )
                    current.children.append(child)
                current = child
            current.children.append(
                TreeNode(
                    name=metadata.name,
                    path=metadata.relative_path,
                    type="file",
                    file=metadata,
                )
            )
        return root_node
