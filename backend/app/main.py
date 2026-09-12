from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, AsyncIterator, Literal

from fastapi import FastAPI, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .config import LibraryConfig
from .library import LibraryIndex
from .models import (
    ConfigResponse,
    ConfigUpdate,
    FileContent,
    FileMetadata,
    SearchResult,
    StatusResponse,
    TreeNode,
)


class APIError(Exception):
    def __init__(self, status: int, code: str, message: str, details: object = None) -> None:
        self.status = status
        self.code = code
        self.message = message
        self.details = details


class ScanAccepted(BaseModel):
    accepted: bool
    status: StatusResponse


def create_app(
    config: LibraryConfig | None = None,
    *,
    scan_on_start: bool = True,
    frontend_dist: Path | None = None,
) -> FastAPI:
    library_config = config or LibraryConfig.create_default()
    index = LibraryIndex(library_config)
    frontend_dist = frontend_dist or Path(__file__).resolve().parents[2] / "frontend" / "dist"

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if scan_on_start:
            await index.request_scan()
        yield

    app = FastAPI(title="Lumina Markdown Library", version="1.0.0", lifespan=lifespan)
    app.state.library = index
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ],
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(APIError)
    async def api_error_handler(_: Request, exc: APIError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed",
                    "details": jsonable_encoder(exc.errors()),
                }
            },
        )

    @app.get("/api/status", response_model=StatusResponse)
    async def status() -> StatusResponse:
        return index.status()

    @app.post("/api/rescan", response_model=ScanAccepted, status_code=202)
    async def rescan() -> ScanAccepted:
        accepted = await index.request_scan()
        return ScanAccepted(accepted=accepted, status=index.status())

    @app.get("/api/config", response_model=ConfigResponse)
    async def get_config() -> ConfigResponse:
        roots, exclusions, max_bytes = library_config.snapshot()
        return ConfigResponse(
            roots=[str(root) for root in roots],
            excluded_names=sorted(exclusions),
            max_markdown_bytes=max_bytes,
        )

    @app.put("/api/config", response_model=ConfigResponse)
    async def update_config(update: ConfigUpdate) -> ConfigResponse:
        try:
            library_config.update(update.roots, update.excluded_names)
        except ValueError as exc:
            raise APIError(400, "invalid_config", str(exc)) from exc
        await index.request_scan(queue_if_running=True)
        roots, exclusions, max_bytes = library_config.snapshot()
        return ConfigResponse(
            roots=[str(root) for root in roots],
            excluded_names=sorted(exclusions),
            max_markdown_bytes=max_bytes,
        )

    @app.get("/api/library/files", response_model=list[FileMetadata])
    async def list_files() -> list[FileMetadata]:
        return index.list_files()

    @app.get("/api/library/tree", response_model=list[TreeNode])
    async def library_tree() -> list[TreeNode]:
        return index.tree()

    @app.get("/api/search", response_model=list[SearchResult])
    async def search(
        q: Annotated[str, Query(min_length=1, max_length=200)],
        mode: Literal["all", "filename", "path", "content"] = "all",
        limit: Annotated[int, Query(ge=1, le=100)] = 30,
    ) -> list[SearchResult]:
        return index.search(q, mode, limit)

    @app.get("/api/files/{file_id}", response_model=FileContent)
    async def get_file(file_id: str) -> FileContent:
        file = index.read_file(file_id)
        if file is None:
            raise APIError(
                404,
                "file_not_found",
                "The file is not indexed, no longer exists, or is no longer safe to read",
            )
        return file

    @app.get("/api/files/{file_id}/images")
    async def get_image(
        file_id: str,
        path: Annotated[str, Query(min_length=1, max_length=1000)],
    ) -> FileResponse:
        image = index.resolve_image(file_id, path)
        if image is None:
            raise APIError(
                404,
                "image_not_found",
                "The image is invalid, outside the allowed root, or does not exist",
            )
        return FileResponse(Path(image))

    frontend_index = frontend_dist / "index.html"
    frontend_assets = frontend_dist / "assets"
    if frontend_index.is_file():
        if frontend_assets.is_dir():
            app.mount("/assets", StaticFiles(directory=frontend_assets), name="frontend-assets")

        @app.get("/{path:path}", include_in_schema=False)
        async def frontend(path: str) -> FileResponse:
            del path
            return FileResponse(frontend_index)

    return app


app = create_app()
