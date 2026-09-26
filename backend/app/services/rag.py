import anyio

from app.services import azure_ai, vector_store


async def retrieve(query: str, top_k: int = 5) -> list[dict]:
    """Embed `query` and search Qdrant for the most relevant chunks.

    The embeddings SDK call is sync, so it's offloaded to a worker thread
    to avoid blocking the FastAPI event loop.
    """
    query_vector = await anyio.to_thread.run_sync(azure_ai.embed_text, query)
    if not query_vector:
        return []
    return await anyio.to_thread.run_sync(vector_store.search, query_vector, top_k)


def build_context_block(chunks: list[dict]) -> str:
    if not chunks:
        return ""
    parts = []
    for i, chunk in enumerate(chunks, start=1):
        source = chunk.get("filename") or "unknown source"
        parts.append(f"[{i}] ({source})\n{chunk['text']}")
    return "\n\n".join(parts)
