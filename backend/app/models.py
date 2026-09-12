from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FileMetadata(BaseModel):
    id: str
    name: str
    relative_path: str
    root: str
    size: int
    modified_at: datetime
    created_at: datetime | None = None
    title: str | None = None
    tags: list[str] = Field(default_factory=list)
    word_count: int = 0


class FileContent(FileMetadata):
    content: str


class SearchResult(FileMetadata):
    match_type: Literal["filename", "path", "content"]
    snippet: str | None = None
    matches: int = 0
    score: float = 0.0


class StatusResponse(BaseModel):
    state: Literal["idle", "scanning", "error"]
    indexed_files: int
    started_at: datetime | None
    completed_at: datetime | None
    error: str | None
    generation: int


class ConfigResponse(BaseModel):
    roots: list[str]
    excluded_names: list[str]
    max_markdown_bytes: int


class ConfigUpdate(BaseModel):
    roots: list[str] = Field(min_length=1)
    excluded_names: list[str] | None = None


class TreeNode(BaseModel):
    name: str
    path: str
    type: Literal["root", "directory", "file"]
    file: FileMetadata | None = None
    children: list["TreeNode"] = Field(default_factory=list)

