import uuid

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.core.config import get_settings

settings = get_settings()

_client: QdrantClient | None = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.qdrant_url)
    return _client


def ensure_collection() -> None:
    client = get_client()
    existing = {c.name for c in client.get_collections().collections}
    if settings.qdrant_collection in existing:
        return
    client.create_collection(
        collection_name=settings.qdrant_collection,
        vectors_config=qmodels.VectorParams(
            size=settings.azure_ai_foundry_embedding_dimensions,
            distance=qmodels.Distance.COSINE,
        ),
    )


def upsert_chunks(
    document_id: str,
    filename: str,
    category: str | None,
    chunks: list[str],
    vectors: list[list[float]],
) -> None:
    client = get_client()
    points = [
        qmodels.PointStruct(
            id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"{document_id}-{i}")),
            vector=vector,
            payload={
                "document_id": document_id,
                "chunk_index": i,
                "text": chunk,
                "filename": filename,
                "category": category,
            },
        )
        for i, (chunk, vector) in enumerate(zip(chunks, vectors))
    ]
    client.upsert(collection_name=settings.qdrant_collection, points=points)


def delete_by_document(document_id: str) -> None:
    client = get_client()
    client.delete(
        collection_name=settings.qdrant_collection,
        points_selector=qmodels.FilterSelector(
            filter=qmodels.Filter(
                must=[qmodels.FieldCondition(key="document_id", match=qmodels.MatchValue(value=document_id))]
            )
        ),
    )


def search(query_vector: list[float], top_k: int = 5) -> list[dict]:
    client = get_client()
    results = client.search(
        collection_name=settings.qdrant_collection,
        query_vector=query_vector,
        limit=top_k,
    )
    return [
        {
            "score": r.score,
            "text": r.payload.get("text", ""),
            "filename": r.payload.get("filename"),
            "document_id": r.payload.get("document_id"),
            "chunk_index": r.payload.get("chunk_index"),
        }
        for r in results
    ]
