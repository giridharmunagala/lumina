"""Lightweight Markdown introspection: front matter, title, and word count."""

from __future__ import annotations

import re
from dataclasses import dataclass


FRONT_MATTER = re.compile(r"\A\ufeff?---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)", re.DOTALL)
ATX_HEADING = re.compile(r"^\s{0,3}#\s+(.+?)\s*#*\s*$")
SETEXT_UNDERLINE = re.compile(r"^\s{0,3}=+\s*$")
INLINE_MARKUP = re.compile(r"[*_`~]+")
LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
WORD = re.compile(r"[\w'’-]+")
CODE_FENCE = re.compile(r"^\s{0,3}(?:```|~~~)")
MAX_TAGS = 12


@dataclass(frozen=True, slots=True)
class DocumentInfo:
    """Metadata derived from a Markdown document body."""

    title: str | None
    tags: tuple[str, ...]
    word_count: int
    body: str


def _clean_scalar(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    return value.strip()


def parse_front_matter(text: str) -> tuple[dict[str, object], str]:
    """Parse a small, safe subset of YAML front matter and return it with the body."""
    match = FRONT_MATTER.match(text)
    if match is None:
        return {}, text
    data: dict[str, object] = {}
    key: str | None = None
    for raw_line in match.group(1).splitlines():
        line = raw_line.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.lstrip().startswith("- ") and key is not None:
            item = _clean_scalar(line.lstrip()[2:])
            if item:
                existing = data.get(key)
                data[key] = [*existing, item] if isinstance(existing, list) else [item]
            continue
        name, separator, value = line.partition(":")
        if not separator or name != name.strip():
            continue
        key = name.strip().casefold()
        value = _clean_scalar(value)
        if value.startswith("[") and value.endswith("]"):
            data[key] = [_clean_scalar(item) for item in value[1:-1].split(",") if item.strip()]
        elif value:
            data[key] = value
        else:
            data[key] = []
    return data, text[match.end() :]


def clean_heading(value: str) -> str:
    value = LINK.sub(r"\1", value)
    value = INLINE_MARKUP.sub("", value)
    return value.strip()


def first_heading(body: str) -> str | None:
    previous = ""
    in_code = False
    for raw_line in body.splitlines():
        if CODE_FENCE.match(raw_line):
            in_code = not in_code
            previous = ""
            continue
        if in_code:
            continue
        heading = ATX_HEADING.match(raw_line)
        if heading:
            title = clean_heading(heading.group(1))
            if title:
                return title
        if previous.strip() and SETEXT_UNDERLINE.match(raw_line):
            title = clean_heading(previous)
            if title:
                return title
        previous = raw_line
    return None


def count_words(body: str) -> int:
    return len(WORD.findall(body))


def _tags_from(front_matter: dict[str, object]) -> tuple[str, ...]:
    collected: list[str] = []
    for key in ("tags", "keywords", "categories"):
        value = front_matter.get(key)
        if isinstance(value, str):
            candidates = [part for part in re.split(r"[,\s]+", value) if part]
        elif isinstance(value, list):
            candidates = [str(part) for part in value]
        else:
            continue
        for candidate in candidates:
            tag = candidate.strip().lstrip("#").strip()
            if tag and tag not in collected:
                collected.append(tag)
    return tuple(collected[:MAX_TAGS])


def describe(text: str, *, fallback_title: str | None = None) -> DocumentInfo:
    """Return title, tags, word count, and the body without front matter."""
    front_matter, body = parse_front_matter(text)
    raw_title = front_matter.get("title")
    title = _clean_scalar(raw_title) if isinstance(raw_title, str) else None
    return DocumentInfo(
        title=title or first_heading(body) or fallback_title,
        tags=_tags_from(front_matter),
        word_count=count_words(body),
        body=body,
    )
