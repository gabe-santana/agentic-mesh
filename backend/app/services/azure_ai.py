"""Wrappers around Azure AI Foundry's OpenAI-compatible endpoint (`/openai/v1`),
accessed via the standard `openai` SDK pointed at that `base_url`.

Two clients are exposed:
- `stream_chat`      -> async generator of text deltas, used by the FastAPI SSE endpoint
                        (uses the Responses API, `client.responses.create(..., stream=True)`).
- `embed_texts`      -> sync call, used by the Celery ingestion worker (sync task context).
"""

from collections.abc import AsyncGenerator

from openai import AsyncOpenAI, OpenAI

from app.core.config import get_settings

settings = get_settings()


class ChatTurn:
    def __init__(self, role: str, content: str):
        self.role = role
        self.content = content


async def stream_chat(turns: list[ChatTurn]) -> AsyncGenerator[str, None]:
    """Stream Responses API text deltas from Azure AI Foundry."""
    client = AsyncOpenAI(
        base_url=settings.azure_ai_foundry_endpoint,
        api_key=settings.azure_ai_foundry_api_key,
    )

    instructions = None
    input_messages = []
    for turn in turns:
        if turn.role == "system":
            instructions = turn.content
        else:
            input_messages.append({"role": turn.role, "content": turn.content})

    try:
        stream = await client.responses.create(
            model=settings.azure_ai_foundry_chat_deployment,
            input=input_messages,
            instructions=instructions,
            stream=True,
        )
        async for event in stream:
            if event.type == "response.output_text.delta":
                yield event.delta
    finally:
        await client.close()


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts synchronously (used from Celery tasks)."""
    if not texts:
        return []
    client = OpenAI(
        base_url=settings.azure_ai_foundry_endpoint,
        api_key=settings.azure_ai_foundry_api_key,
    )
    try:
        response = client.embeddings.create(
            input=texts,
            model=settings.azure_ai_foundry_embedding_deployment,
        )
        return [item.embedding for item in response.data]
    finally:
        client.close()


def embed_text(text: str) -> list[float]:
    vectors = embed_texts([text])
    return vectors[0] if vectors else []
