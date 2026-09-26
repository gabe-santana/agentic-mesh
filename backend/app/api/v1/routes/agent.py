import json
import time
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.agents.rag_agent import AgentRegistry
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.chat import AgentRun, ChatMessage, ChatSession
from app.models.user import User
from app.schemas.chat import AgentQueryRequest, ChatMessageResponse, ChatSessionResponse
from app.services.azure_ai import ChatTurn

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/stream")
async def stream_agent(
    payload: AgentQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EventSourceResponse:
    if payload.session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == payload.session_id, ChatSession.user_id == current_user.id
            )
        )
        session = result.scalar_one_or_none()
        if session is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    else:
        session = ChatSession(user_id=current_user.id, title=payload.prompt[:80])
        db.add(session)
        await db.commit()
        await db.refresh(session)

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    history_turns = [ChatTurn(m.role, m.content) for m in list(history_result.scalars().all())[-20:]]

    db.add(ChatMessage(session_id=session.id, role="user", content=payload.prompt))
    await db.commit()

    agent = AgentRegistry.get(payload.agent_type)

    async def event_generator() -> AsyncGenerator[dict, None]:
        full_text = ""
        sources: list[dict] = []
        run_status = "success"
        error_message: str | None = None
        start = time.perf_counter()

        try:
            yield {"event": "message", "data": json.dumps({"type": "session", "session_id": session.id})}
            async for event in agent.stream(history_turns, payload.prompt, payload.enable_rag):
                if event["type"] == "done":
                    sources = event["sources"]
                else:
                    full_text += event.get("content", "")
                yield {"event": "message", "data": json.dumps(event)}
        except Exception as exc:  # noqa: BLE001
            run_status = "failed"
            error_message = str(exc)
            yield {"event": "message", "data": json.dumps({"type": "error", "message": error_message})}
        finally:
            latency_ms = int((time.perf_counter() - start) * 1000)
            if full_text:
                db.add(
                    ChatMessage(
                        session_id=session.id,
                        role="assistant",
                        content=full_text,
                        sources_json=json.dumps(sources) if sources else None,
                    )
                )
            db.add(
                AgentRun(
                    session_id=session.id,
                    user_id=current_user.id,
                    agent_type=payload.agent_type,
                    prompt=payload.prompt,
                    status=run_status,
                    latency_ms=latency_ms,
                    retrieved_chunks=len(sources),
                    error_message=error_message,
                )
            )
            await db.commit()

    return EventSourceResponse(event_generator())


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ChatSession]:
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
async def list_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ChatMessage]:
    session_result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    if session_result.scalar_one_or_none() is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

    result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
    )
    return list(result.scalars().all())


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

    await db.execute(delete(ChatMessage).where(ChatMessage.session_id == session_id))
    await db.execute(delete(AgentRun).where(AgentRun.session_id == session_id))
    await db.delete(session)
    await db.commit()
