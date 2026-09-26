from datetime import datetime

from pydantic import BaseModel


class AgentQueryRequest(BaseModel):
    prompt: str
    session_id: str | None = None
    enable_rag: bool = True
    agent_type: str = "rag_chat"


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}
