import asyncio
import os

from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.models.document import Document
from app.services import azure_ai, vector_store
from app.utils.chunking import chunk_text
from app.workers.celery_app import celery_app

settings = get_settings()


def _extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        reader = PdfReader(file_path)
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    with open(file_path, encoding="utf-8", errors="ignore") as f:
        return f.read()


async def _ingest(document_id: str) -> None:
    # Each Celery task runs its own asyncio.run() (its own event loop, opened
    # and closed within this call). A pooled engine shared across separate
    # asyncio.run() calls ends up with connections bound to an already-closed
    # loop, so this task creates and disposes its own engine per invocation
    # rather than reusing app.core.db's module-level engine/pool.
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with session_factory() as db:
            result = await db.execute(select(Document).where(Document.id == document_id))
            document = result.scalar_one_or_none()
            if document is None:
                return

            document.status = "processing"
            await db.commit()

            try:
                text = _extract_text(document.file_path)
                chunks = chunk_text(text)
                if not chunks:
                    raise ValueError("No extractable text found in document")

                vectors = azure_ai.embed_texts(chunks)
                vector_store.ensure_collection()
                vector_store.upsert_chunks(document.id, document.filename, document.category, chunks, vectors)

                document.status = "ready"
                document.chunk_count = len(chunks)
            except Exception as exc:  # noqa: BLE001
                document.status = "failed"
                document.error_message = str(exc)
            finally:
                await db.commit()
    finally:
        await engine.dispose()


@celery_app.task(name="ingest_document_task")
def ingest_document_task(document_id: str) -> None:
    asyncio.run(_ingest(document_id))
