"""RAGChatAgent: retrieve-then-generate agent.

Deliberately a plain async class rather than a graph/DAG framework
(LangGraph/Semantic Kernel) to keep the MVP dependency footprint small.
`AgentRegistry` below exists so additional agent types can be registered
without changing the API route.
"""

from collections.abc import AsyncGenerator

from app.services import rag
from app.services.azure_ai import ChatTurn, stream_chat

SYSTEM_PROMPT = (
    "You are AgenticMesh's assistant, a helpful enterprise AI agent. "
    "Answer clearly and concisely. When retrieved context is provided, ground your "
    "answer in it and reference sources using [n] matching the numbering given. "
    "If the context doesn't contain the answer, say so instead of guessing. "
    "Always format your response as Markdown: use headings, bold/italic, bullet or "
    "numbered lists, and tables where they make the answer clearer. Use fenced code "
    "blocks (```) for any code, commands, or file contents."
)


class RAGChatAgent:
    agent_type = "rag_chat"

    async def stream(
        self,
        history: list[ChatTurn],
        prompt: str,
        enable_rag: bool,
    ) -> AsyncGenerator[dict, None]:
        sources: list[dict] = []
        system_content = SYSTEM_PROMPT

        if enable_rag:
            sources = await rag.retrieve(prompt)
            context = rag.build_context_block(sources)
            if context:
                system_content += (
                    "\n\n--- Retrieved context ---\n" + context + "\n--- End context ---"
                )

        turns = [ChatTurn("system", system_content), *history, ChatTurn("user", prompt)]

        async for delta in stream_chat(turns):
            yield {"type": "token", "content": delta}

        yield {"type": "done", "sources": sources}


class AgentRegistry:
    _agents = {"rag_chat": RAGChatAgent()}

    @classmethod
    def get(cls, agent_type: str) -> RAGChatAgent:
        return cls._agents.get(agent_type, cls._agents["rag_chat"])
