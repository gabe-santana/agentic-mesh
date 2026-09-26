from datetime import datetime

from pydantic import BaseModel


class AgentQueryRequest(BaseModel):
    prompt: str
    session_id: str | None = None
    enable_rag: bool = True
    agent_type: str = "rag_chat"


class TraceTiming(BaseModel):
    retrieval_ms: int
    generation_ms: int
    total_ms: int


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
    sources: list[dict] | None = None
    system_prompt: str | None = None
    timing: TraceTiming | None = None

    model_config = {"from_attributes": True}


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}
