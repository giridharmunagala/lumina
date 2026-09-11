from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from threading import RLock
from typing import Iterable


DEFAULT_EXCLUDED_NAMES = frozenset(
    {
        "$recycle.bin",
        ".cache",
        ".git",
        ".hg",
        ".idea",
        ".next",
        ".npm",
        ".svn",
        ".tox",
        ".venv",
        ".vscode",
        "__pycache__",
        "appdata",
        "boot",
        "cache",
        "dev",
        "dist",
        "etc",
        "library",
        "lost+found",
        "node_modules",
        "opt",
        "proc",
        "program files",
        "program files (x86)",
        "programdata",
        "run",
        "site-packages",
        "sys",
        "system volume information",
        "usr",
        "var",
        "vendor",
        "venv",
        "windows",
    }
)


def default_roots(home: Path | None = None) -> list[Path]:
    home = (home or Path.home()).expanduser()
    candidates = [
        home,
        home / ".copilot",
    ]
    return [path.resolve() for path in candidates if path.is_dir()]


def roots_from_environment() -> list[Path] | None:
    value = os.getenv("LUMINA_ALLOWED_ROOTS")
    if not value:
        return None
    return [Path(item).expanduser() for item in value.split(os.pathsep) if item]


def normalize_roots(roots: Iterable[Path | str]) -> tuple[Path, ...]:
    normalized: list[Path] = []
    for value in roots:
        path = Path(value).expanduser()
        try:
            resolved = path.resolve(strict=True)
        except (FileNotFoundError, OSError) as exc:
            raise ValueError(f"Root does not exist: {path}") from exc
        if not resolved.is_dir():
            raise ValueError(f"Root is not a directory: {path}")
        if resolved not in normalized:
            normalized.append(resolved)
    if not normalized:
        raise ValueError("At least one allowed root is required")
    return tuple(normalized)


@dataclass(slots=True)
class LibraryConfig:
    roots: tuple[Path, ...]
    excluded_names: frozenset[str] = DEFAULT_EXCLUDED_NAMES
    max_markdown_bytes: int = 5 * 1024 * 1024
    _lock: RLock = field(default_factory=RLock, repr=False)

    @classmethod
    def create_default(cls) -> "LibraryConfig":
        configured = roots_from_environment()
        roots = configured if configured is not None else default_roots()
        if not roots:
            roots = [Path.cwd()]
        return cls(roots=normalize_roots(roots))

    def snapshot(self) -> tuple[tuple[Path, ...], frozenset[str], int]:
        with self._lock:
            return self.roots, self.excluded_names, self.max_markdown_bytes

    def update(
        self,
        roots: Iterable[Path | str],
        excluded_names: Iterable[str] | None = None,
    ) -> None:
        normalized = normalize_roots(roots)
        exclusions = (
            frozenset(name.strip().casefold() for name in excluded_names if name.strip())
            if excluded_names is not None
            else self.excluded_names
        )
        with self._lock:
            self.roots = normalized
            self.excluded_names = exclusions
