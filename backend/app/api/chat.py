from __future__ import annotations

from typing import Any, Dict, Literal, Optional
import logging

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from ..services.opensea_client import OpenSeaClient
from ..services.intent_classifier import LLMIntentClassifier
from ..services.query_rewriter import QueryRewriter
from ..services.small_talk import SmallTalkResponder
from ..core.database import get_db
from ..models.models import ConversationMessage


router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger("scooby.chat")


class ChatRequest(BaseModel):
    intent: Optional[Literal["small_talk", "opensea_trending", "opensea_volume", "opensea_collections"]] = None
    message: str = Field(..., description="User message")
    params: Optional[Dict[str, Any]] = None
    conversation_id: Optional[str] = Field(default=None, description="Client-side chat id")
    user_id: Optional[str] = Field(default=None, description="UUID of the logged-in user, if available")


class ChatResponse(BaseModel):
    reply: str
    data: Optional[Dict[str, Any]] = None


@router.post("/message", response_model=ChatResponse)
async def handle_message(req: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    # Fetch short conversation history
    history_pairs: list[str] = []
    if req.conversation_id:
        stmt = select(ConversationMessage).where(ConversationMessage.conversation_id == req.conversation_id)
        if req.user_id:
            stmt = stmt.where(ConversationMessage.user_id == req.user_id)
        stmt = stmt.order_by(ConversationMessage.created_at.asc()).limit(20)
        rows = db.execute(stmt).scalars().all()
        for r in rows:
            if r.ai_answer:
                history_pairs.append(f"User: {r.user_question}\nAssistant: {r.ai_answer}")

    # Rewrite user message with context
    rewriter = QueryRewriter()
    rewritten = await rewriter.rewrite(req.message, history_pairs)
    logger.info("[Chat] Original: %r | Rewritten: %r", req.message, rewritten)

    # Classify intent on the rewritten query
    classifier = LLMIntentClassifier()
    intent = req.intent or await classifier.classify(rewritten)

    if intent == "small_talk":
        responder = SmallTalkResponder()
        reply = await responder.respond(rewritten, history_pairs)
        logger.info("[Chat] SmallTalk reply: %r", reply)
        _persist(db, req, rewritten, intent, reply)
        return ChatResponse(reply=reply)

    client = OpenSeaClient()

    if intent == "opensea_trending":
        limit = int((req.params or {}).get("limit", 20))
        data = await client.get_trending_collections(limit=limit)
        logger.info("[Chat] Trending fetched: %d items", len(data) if isinstance(data, list) else -1)
        reply_text = f"Here are the top {limit} trending NFT collections in ~24h by volume."
        _persist(db, req, rewritten, intent, reply_text, data)
        return ChatResponse(
            reply=reply_text,
            data=data,
        )

    if intent == "opensea_volume":
        params = req.params or {}
        min_volume = float(params.get("min_volume_eth", 3000000))
        days = int(params.get("days", 5))
        chain = params.get("chain")
        data = await client.get_collections_by_volume(min_volume_eth=min_volume, days=days, chain=chain)
        logger.info("[Chat] Volume fetched: params min=%s days=%s chain=%s", min_volume, days, chain)
        reply_text = f"Collections with at least {min_volume} ETH volume in the last {days} days."
        _persist(db, req, rewritten, intent, reply_text, data)
        return ChatResponse(reply=reply_text, data=data)

    if intent == "opensea_collections":
        params = req.params or {}
        order_by = str(params.get("order_by", "market_cap"))
        order_direction = str(params.get("order_direction", "desc"))
        limit = int(params.get("limit", 50))
        chain = params.get("chain")
        data = await client.get_collections(order_by=order_by, order_direction=order_direction, limit=limit, chain=chain)
        logger.info("[Chat] Collections fetched: order_by=%s direction=%s limit=%s chain=%s", order_by, order_direction, limit, chain)
        reply_text = f"Top {limit} collections ordered by {order_by} ({order_direction})."
        _persist(db, req, rewritten, intent, reply_text, data)
        return ChatResponse(reply=reply_text, data=data)

    raise HTTPException(status_code=400, detail="Unsupported intent")


def _small_talk_reply(message: str) -> str:  # kept for backward compatibility (unused with LLM path)
    return "I'm Scooby – ask me anything about NFTs, collections, or market trends."


def _persist(db: Session, req: ChatRequest, rewritten: str, intent: str, reply: str, data: Dict[str, Any] | None = None) -> None:
    try:
        rec = ConversationMessage(
            user_id=req.user_id,  # type: ignore[arg-type]
            conversation_id=req.conversation_id or "",
            user_question=req.message,
            rewritten_question=rewritten,
            intent=intent,
            ai_answer=reply,
        )
        db.add(rec)
        db.commit()
    except Exception:
        db.rollback()


class ConversationSummary(BaseModel):
    conversation_id: str
    last_message_at: str
    preview: str


@router.get("/conversations")
def list_conversations(user_id: Optional[str] = None, db: Session = Depends(get_db)) -> list[ConversationSummary]:
    # Group by conversation_id and get last created_at + preview text
    stmt = (
        select(
            ConversationMessage.conversation_id,
            func.max(ConversationMessage.created_at).label("last_message_at"),
            func.substr(func.coalesce(ConversationMessage.user_question, ""), 1, 80).label("preview"),
        )
        .group_by(ConversationMessage.conversation_id)
        .order_by(func.max(ConversationMessage.created_at).desc())
    )
    if user_id:
        stmt = stmt.where(ConversationMessage.user_id == user_id)
    rows = db.execute(stmt).all()
    return [
        ConversationSummary(
            conversation_id=r[0], last_message_at=r[1].isoformat() if r[1] else "", preview=r[2] or ""
        )
        for r in rows
    ]


