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
import aiohttp
from ..models.models import ConversationMessage, User


router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger("scooby.chat")


class ChatRequest(BaseModel):
    intent: Optional[Literal["small_talk", "opensea_trending", "opensea_volume", "opensea_collections"]] = None
    message: str = Field(..., description="User message")
    params: Optional[Dict[str, Any]] = None
    conversation_id: Optional[str] = Field(default=None, description="Client-side chat id")
    user_id: Optional[str] = Field(default=None, description="UUID of the logged-in user, if available")
    wallet_address: Optional[str] = Field(default=None, description="Wallet address if authenticating by wallet")


class ChatResponse(BaseModel):
    reply: str
    data: Optional[Dict[str, Any]] = None


@router.post("/message", response_model=ChatResponse)
async def handle_message(req: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    # Resolve effective user id from wallet if needed
    effective_user_id: Optional[str] = req.user_id
    if not effective_user_id and req.wallet_address:
        effective_user_id = _get_or_create_user_id_by_wallet(db, req.wallet_address)
    # Fetch short conversation history
    history_pairs: list[str] = []
    if req.conversation_id:
        stmt = select(ConversationMessage).where(ConversationMessage.conversation_id == req.conversation_id)
        if effective_user_id:
            stmt = stmt.where(ConversationMessage.user_id == effective_user_id)
        stmt = stmt.order_by(ConversationMessage.created_at.asc()).limit(20)
        rows = db.execute(stmt).scalars().all()
        for r in rows:
            if r.ai_answer:
                history_pairs.append(f"User: {r.user_question}\nAssistant: {r.ai_answer}")

    # Rewrite user message with context
    #rewriter = QueryRewriter()
    #rewritten = await rewriter.rewrite(req.message, history_pairs)
    rewritten = req.message
    logger.info("[Chat] Original: %r | Rewritten: %r", req.message, rewritten)

    # Classify intent on the rewritten query
    classifier = LLMIntentClassifier()
    #intent = req.intent or await classifier.classify(rewritten)
    intent = "create_pool"
    logger.info("[Chat] Intent: %r", intent)

    if intent == "small_talk":
        responder = SmallTalkResponder()
        reply = await responder.respond(rewritten, history_pairs)
        logger.info("[Chat] SmallTalk reply: %r", reply)
        _persist(db, req, rewritten, intent, reply, effective_user_id=effective_user_id)
        return ChatResponse(reply=reply)
    if intent == "create_pool":

        # Inform user and persist
        # Attempt to create the pool by calling the Next.js API route
        creation_ok = False
        creation_err: str | None = None
        pool_response: dict | None = None
        try:
            fe_base = "http://localhost:3002"
            url = f"{fe_base}/api/pool/create"
            headers = {
                "Content-Type": "application/json",
                "x-internal-call": "true"
            }

            payload = {'name': "test_eric", 'nftCollectionAddress': '0xbd3531da5cf5857e7cfaa92426877b022e612cf8', 'creatorFee': 0.0, 'buyPrice': 15.0, 'sellPrice': 20.0, 'collection_slug': 'pudgypenguins', 'chainId': 11011}
            
            
            # Add wallet_address to the payload for server-to-server authentication
            payload_with_auth = {**payload, "wallet_address": req.wallet_address}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload_with_auth, headers=headers) as resp:
                    if resp.status == 200:
                        creation_ok = True
                        pool_response = await resp.json()
                    else:
                        creation_err = f"frontend returned {resp.status}: {await resp.text()}"
        except Exception as e:  # noqa: BLE001
            creation_err = str(e)

        if creation_ok:
            reply_text = "Pool created successfully."
            _persist(db, req, rewritten, intent, reply_text, data={"pool": pool_response}, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text, data={"pool": pool_response})
        else:
            # Fallback: return payload so FE can still trigger manually
            reply_text = "Got it. Creating the pool with the provided details. The automatic creation failed; please try from the UI."
            if creation_err:
                reply_text += f" Error: {creation_err}"
            _persist(db, req, rewritten, intent, reply_text, data=payload, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text, data=payload)

    client = OpenSeaClient()

    if intent == "opensea_trending":
        limit = int((req.params or {}).get("limit", 20))
        data = await client.get_trending_collections(limit=limit)
        logger.info("[Chat] Trending fetched: %d items", len(data) if isinstance(data, list) else -1)
        reply_text = f"Here are the top {limit} trending NFT collections in ~24h by volume."
        _persist(db, req, rewritten, intent, reply_text, data, effective_user_id=effective_user_id)
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
        _persist(db, req, rewritten, intent, reply_text, data, effective_user_id=effective_user_id)
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
        _persist(db, req, rewritten, intent, reply_text, data, effective_user_id=effective_user_id)
        return ChatResponse(reply=reply_text, data=data)

    raise HTTPException(status_code=400, detail="Unsupported intent")


def _small_talk_reply(message: str) -> str:  # kept for backward compatibility (unused with LLM path)
    return "I'm Scooby – ask me anything about NFTs, collections, or market trends."


def _persist(db: Session, req: ChatRequest, rewritten: str, intent: str, reply: str, data: Dict[str, Any] | None = None, *, effective_user_id: Optional[str] = None) -> None:
    try:
        rec = ConversationMessage(
            user_id=effective_user_id,  # type: ignore[arg-type]
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


def _get_or_create_user_id_by_wallet(db: Session, wallet_address: str) -> str:
    """Return a stable user_id for a wallet. Create a lightweight user if needed.

    This avoids requiring email/password for wallet-auth users.
    """
    normalized = wallet_address.strip().lower()
    existing = db.query(User).filter(User.wallet_address == normalized).first()
    if existing:
        return str(existing.user_id)

    # Create a minimal user record with just wallet_address
    new_user = User(wallet_address=normalized)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return str(new_user.user_id)


class ConversationSummary(BaseModel):
    conversation_id: str
    last_message_at: str
    preview: str


@router.get("/conversations")
def list_conversations(user_id: Optional[str] = None, wallet_address: Optional[str] = None, db: Session = Depends(get_db)) -> list[ConversationSummary]:
    # Fetch the latest message per conversation using a window function (avoids GROUP BY issues)
    # Determine user_id from wallet if provided
    if not user_id and wallet_address:
        user_id = _get_or_create_user_id_by_wallet(db, wallet_address)

    base = select(
        ConversationMessage.conversation_id,
        ConversationMessage.created_at,
        ConversationMessage.user_question,
        func.row_number()
        .over(
            partition_by=ConversationMessage.conversation_id,
            order_by=ConversationMessage.created_at.desc(),
        )
        .label("rn"),
    )
    if user_id:
        base = base.where(ConversationMessage.user_id == user_id)

    subq = base.subquery()

    stmt = (
        select(
            subq.c.conversation_id,
            subq.c.created_at.label("last_message_at"),
            func.substr(func.coalesce(subq.c.user_question, ""), 1, 80).label("preview"),
        )
        .where(subq.c.rn == 1)
        .order_by(subq.c.created_at.desc())
    )

    rows = db.execute(stmt).all()
    return [
        ConversationSummary(
            conversation_id=r[0], last_message_at=r[1].isoformat() if r[1] else "", preview=r[2] or ""
        )
        for r in rows
    ]


