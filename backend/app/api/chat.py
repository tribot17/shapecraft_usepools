from __future__ import annotations

import os
from typing import Any, Dict, Literal, Optional
import logging
import json 
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy import select, func

from ..services.opensea_client import OpenSeaClient
from ..services.intent_classifier import LLMIntentClassifier
from ..services.query_rewriter import QueryRewriter
from ..services.small_talk import SmallTalkResponder
from ..services.stats_responder import StatsResponder
from ..core.database import get_db
import aiohttp
from ..models.models import ConversationMessage, User


router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger("scooby.chat")


class ChatRequest(BaseModel):
    intent: Optional[Literal["small_talk", "opensea_trending", "opensea_volume", "opensea_collections", "nft_statistics"]] = None
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
    rewriter = QueryRewriter()
    rewritten = await rewriter.rewrite(req.message, history_pairs)
    rewritten = req.message
    logger.info("[Chat] Original: %r | Rewritten: %r", req.message, rewritten)

    # Check if we're already in a create_pool flow by looking at recent conversation history
    in_create_pool_flow = False
    if req.conversation_id and history_pairs:
        # Check the last assistant message for create_pool keywords
        last_pair = history_pairs[-1] if history_pairs else ""
        if "Assistant:" in last_pair:
            last_reply = last_pair.split("Assistant:", 1)[1].strip().lower()
            create_pool_keywords = [
                "what name do we give to the pool",
                "opensea collection link",
                "creator fee",
                "buying price", "set a buying price",
                "selling price", "set a selling price"
            ]
            in_create_pool_flow = any(keyword in last_reply for keyword in create_pool_keywords)

    # Classify intent - if we're in create_pool flow, stay in it unless user cancels
    if in_create_pool_flow and not any(w in req.message.lower() for w in ["cancel", "stop", "abort"]):
        intent = "create_pool"
        logger.info("[Chat] Staying in create_pool flow (detected from conversation history)")
    else:
        classifier = LLMIntentClassifier()
        intent = await classifier.classify(rewritten)
        logger.info("[Chat] Intent: %r", intent)

    if intent == "small_talk":
        responder = SmallTalkResponder()
        reply = await responder.respond(rewritten, history_pairs)
        logger.info("[Chat] SmallTalk reply: %r", reply)
        _persist(db, req, rewritten, intent, reply, effective_user_id=effective_user_id)
        return ChatResponse(reply=reply)
    if intent == "create_pool":
        # Check for cancellation
        if any(w in req.message.lower() for w in ["cancel", "stop", "abort"]):
            reply_text = "Okay, I've cancelled the pool creation flow."
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)
        
        # Simple regex-based extraction for robustness
        import re

        def extract(pattern: str, text: str) -> str | None:
            m = re.search(pattern, text, flags=re.I)
            return m.group(1).strip() if m else None

        def parse_number(text: str) -> str | None:
            m = re.search(r"([0-9]+(?:[\.,][0-9]+)?)", text)
            if not m:
                return None
            return m.group(1).replace(",", ".")

        # Get conversation history for this conversation
        history_pairs = []
        if req.conversation_id:
            history_msgs = db.execute(
                text("SELECT user_question, ai_answer as assistant_reply FROM conversation_messages WHERE conversation_id = :conv_id ORDER BY created_at ASC"),
                {"conv_id": req.conversation_id}
            ).fetchall()
            for msg in history_msgs:
                if msg[0] and msg[1]:  # user_question and assistant_reply
                    history_pairs.append(f"User: {msg[0]}\nAssistant: {msg[1]}")

        transcript = "\n".join(history_pairs + [f"User: {req.message}"])
        logger.info("[Chat] Full transcript: %r", transcript)
        last_assistant = None
        last_user_text = None
        if history_pairs:
            try:
                last_pair = history_pairs[-1]
                # Extract last user and assistant texts from the formatted pair
                if "Assistant:" in last_pair and "User:" in last_pair:
                    parts = last_pair.split("User:", 1)[1]  # Get everything after "User:"
                    if "Assistant:" in parts:
                        user_part = parts.split("Assistant:", 1)[0].strip()
                        assistant_part = parts.split("Assistant:", 1)[1].strip()
                        last_user_text = user_part
                        last_assistant = assistant_part.lower()
                    else:
                        last_user_text = parts.strip()
                elif "Assistant:" in last_pair:
                    last_assistant = last_pair.split("Assistant:", 1)[1].strip().lower()
            except Exception as e:
                logger.warning("[Chat] Error parsing conversation history: %s", e)
                last_assistant = None

        pool_name = extract(r"pool name:\s*(.+)", transcript) or extract(r"name is\s*['\"]?([^\n]+)", transcript)
        opensea_link = extract(r"https?://opensea\.io/collection/([a-z0-9\-]+)", transcript)
        creator_fee = extract(r"creator fee[:\s]*([0-9]+(?:[\.,][0-9]+)?)", transcript)
        buy_price = extract(r"buy(?:ing)? price[:\s]*([0-9]+(?:[\.,][0-9]+)?)", transcript)
        sell_price = extract(r"sell(?:ing)? price[:\s]*([0-9]+(?:[\.,][0-9]+)?)", transcript)
        
        logger.info("[Chat] Extracted values - pool_name: %r, opensea_link: %r, creator_fee: %r, buy_price: %r, sell_price: %r", 
                   pool_name, opensea_link, creator_fee, buy_price, sell_price)

        # If user answered previously to a specific question, reconstruct values
        logger.info("[Chat] last_assistant: %r, last_user_text: %r", last_assistant, last_user_text)
        
        # Also extract values by looking at each conversation turn in sequence
        conversation_turns = []
        for pair in history_pairs:
            if "User:" in pair and "Assistant:" in pair:
                parts = pair.split("User:", 1)[1]  # Get everything after "User:"
                if "Assistant:" in parts:
                    user_msg = parts.split("Assistant:", 1)[0].strip()
                    assistant_msg = parts.split("Assistant:", 1)[1].strip()
                    conversation_turns.append((user_msg, assistant_msg))
        
        # Extract values based on conversation context
        logger.info("[Chat] Conversation turns: %r", conversation_turns)
        for i, (user_msg, assistant_msg) in enumerate(conversation_turns):
            assistant_lower = assistant_msg.lower()
            if "what name do we give to the pool" in assistant_lower and not pool_name:
                # The next user message (if exists) should be the pool name
                if i + 1 < len(conversation_turns):
                    pool_name = conversation_turns[i + 1][0].strip()
                elif req.message.strip():  # Current message is the answer
                    pool_name = req.message.strip()
            elif "opensea collection link" in assistant_lower and not opensea_link:
                # The next user message (if exists) should be the opensea link
                if i + 1 < len(conversation_turns):
                    opensea_link = extract(r"https?://opensea\.io/collection/([a-z0-9\-]+)", conversation_turns[i + 1][0])
                elif req.message.strip():  # Current message is the answer
                    opensea_link = extract(r"https?://opensea\.io/collection/([a-z0-9\-]+)", req.message)
            elif "creator fee" in assistant_lower and not creator_fee:
                if i + 1 < len(conversation_turns):
                    creator_fee = parse_number(conversation_turns[i + 1][0])
                elif req.message.strip():
                    creator_fee = parse_number(req.message)
            elif any(p in assistant_lower for p in ["buying price", "set a buying price"]) and not buy_price:
                if i + 1 < len(conversation_turns):
                    buy_price = parse_number(conversation_turns[i + 1][0])
                elif req.message.strip():
                    buy_price = parse_number(req.message)
            elif any(p in assistant_lower for p in ["selling price", "set a selling price"]) and not sell_price:
                if i + 1 < len(conversation_turns):
                    sell_price = parse_number(conversation_turns[i + 1][0])
                elif req.message.strip():
                    sell_price = parse_number(req.message)
        
        # Legacy fallback logic
        if last_assistant and last_user_text:
            if "creator fee" in last_assistant and not creator_fee:
                creator_fee = parse_number(last_user_text)
            if any(p in last_assistant for p in ["buying price", "set a buying price"]) and not buy_price:
                buy_price = parse_number(last_user_text)
            if any(p in last_assistant for p in ["selling price", "set a selling price"]) and not sell_price:
                sell_price = parse_number(last_user_text)
            if "what name do we give to the pool" in last_assistant and not pool_name:
                pool_name = last_user_text.strip()
            if "opensea collection link" in last_assistant and not opensea_link:
                opensea_link = extract(r"https?://opensea\.io/collection/([a-z0-9\-]+)", last_user_text)

        # If user answered with just a number to the current prompt, capture it
        if not creator_fee and last_assistant and "creator fee" in last_assistant:
            creator_fee = parse_number(req.message)
        if not buy_price and last_assistant and any(p in last_assistant for p in ["buying price", "set a buying price"]):
            buy_price = parse_number(req.message)
        if not sell_price and last_assistant and any(p in last_assistant for p in ["selling price", "set a selling price"]):
            sell_price = parse_number(req.message)
            
        logger.info("[Chat] Final extracted values - pool_name: %r, opensea_link: %r, creator_fee: %r, buy_price: %r, sell_price: %r", 
                   pool_name, opensea_link, creator_fee, buy_price, sell_price)

        # Ask the next missing item in strict order. If the last assistant advanced
        # to a later stage, consider previous fields satisfied to avoid backtracking.
        stage_hint = last_assistant or ""
        advanced_to_buy = any(p in stage_hint for p in ["buying price", "set a buying price"])
        advanced_to_sell = any(p in stage_hint for p in ["selling price", "set a selling price"])

        if not pool_name:
            reply_text = (
                "Great! I will do some questions to characterize the pool. "
                "First, what name do we give to the pool?"
            )
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)
        if not opensea_link:
            reply_text = "Provide the OpenSea collection link (e.g., https://opensea.io/collection/pudgypenguins)."
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)
        if not creator_fee and not advanced_to_buy and not advanced_to_sell:
            reply_text = "What creator fee do you want to add to the pool? Give a percentage, e.g., 0.5"
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)
        if not buy_price and not advanced_to_sell:
            reply_text = "Set a buying price for the NFT (in ETH)."
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)
        if not sell_price:
            reply_text = "Set a selling price for the NFT (in ETH)."
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)

        # We have all inputs. Resolve collection details and chainId via OpenSea
        client = OpenSeaClient()
        data = await client.get_collection(opensea_link)
        # The response shape can vary; sometimes top-level fields describe the
        # collection, and there may also be a field named "collection" which is
        # actually the slug string. Normalize robustly to a dict describing the collection.
        coll = data
        if isinstance(data, dict) and isinstance(data.get("collection"), dict):
            coll = data["collection"]
        # Extract NFT contract address from known fields
        nft_address: str | None = None
        if isinstance(coll, dict):
            candidates = []
            if isinstance(coll.get("primary_asset_contracts"), list):
                candidates.extend(coll.get("primary_asset_contracts") or [])
            if isinstance(coll.get("contracts"), list):
                candidates.extend(coll.get("contracts") or [])
            for c in candidates:
                if isinstance(c, dict) and c.get("address"):
                    nft_address = c["address"]
                    chain_str = c.get("chain")
                    break
            # Fallbacks
            chain_str = (
                locals().get("chain_str")
                or coll.get("chain")
                or "shapeSepolia"
            )
        else:
            nft_address = ""
            chain_str = "shapeSepolia"

        # Map chain string to numeric id used in FE API
        chain_map = {"shape": 360, "shape-sepolia": 11011, "shapeSepolia": 11011}
        chain_id = chain_map.get(str(chain_str), 11011)

        # Build request payload for FE route
        payload = {
            "name": pool_name,
            "nftCollectionAddress": nft_address or "",
            "creatorFee": float(creator_fee or 0),
            "buyPrice": float(buy_price or 0),
            "sellPrice": float(sell_price or 0),
            "chainId": chain_id,
        }
        logger.info("[Chat] Pool creation payload: %r", payload)

        # Attempt to create the pool by calling the Next.js API route
        creation_ok = False
        creation_err: str | None = None
        pool_response: dict | None = None
        try:
            fe_base = os.getenv("FE_BASE_URL", "http://localhost:3002")
            url = f"{fe_base}/api/pool/create"
            headers = {
                "Content-Type": "application/json",
                "x-internal-call": "true"
            }
            
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
            reply_text = "Pool created successfully!"
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
        raw_data = await client.get_collections_by_volume(min_volume_eth=min_volume, days=days, chain=chain)
        logger.info("[Chat] Volume fetched: params min=%s days=%s chain=%s", min_volume, days, chain)
        
        formatted_collections = extract_collections(raw_data)
        formatted_data = {"collections": formatted_collections}
        logger.info("[Chat] Formatted %d collections for volume response", len(formatted_collections))
        logger.info("[Chat] Sample formatted collection: %r", formatted_collections[0] if formatted_collections else None)
        reply_text = f"Collections with at least {min_volume} ETH volume in the last {days} days."
        _persist(db, req, rewritten, intent, reply_text, formatted_data, effective_user_id=effective_user_id)
        return ChatResponse(reply=reply_text, data=formatted_data)

    if intent == "opensea_collections":
        params = req.params or {}
        order_by = str(params.get("order_by", "market_cap"))
        order_direction = str(params.get("order_direction", "desc"))
        limit = int(params.get("limit", 50))
        chain = params.get("chain")
        raw_data = await client.get_collections(order_by=order_by, order_direction=order_direction, limit=limit, chain=chain)
        logger.info("[Chat] Collections fetched: order_by=%s direction=%s limit=%s chain=%s", order_by, order_direction, limit, chain)
        
        # Format the data to return only requested fields
        formatted_collections = []
        collections = raw_data.get("collections", [])
        for collection in collections:
            if isinstance(collection, dict):
                # Extract chain from contracts array
                collection_chain = ""
                contracts = collection.get("contracts", [])
                if contracts and isinstance(contracts, list) and len(contracts) > 0:
                    collection_chain = contracts[0].get("chain", "")
                
                # Get collection slug for URL
                collection_slug = collection.get("collection", "")
                opensea_url = f"https://opensea.io/collection/{collection_slug}" if collection_slug else ""
                
                formatted_collections.append({
                    "name": collection.get("name", ""),
                    "category": collection.get("category", ""),
                    "chain": collection_chain,
                    "opensea_url": opensea_url
                })
        
        formatted_data = {"collections": formatted_collections}
        logger.info("[Chat] Formatted %d collections for collections response", len(formatted_collections))
        logger.info("[Chat] Sample formatted collection: %r", formatted_collections[0] if formatted_collections else None)
        reply_text = f"Top {limit} collections ordered by {order_by} ({order_direction})."
        _persist(db, req, rewritten, intent, reply_text, formatted_data, effective_user_id=effective_user_id)
        return ChatResponse(reply=reply_text, data=formatted_data)

    if intent == "nft_statistics":
        # Try to get a collection slug from message or params
        import re
        text_msg = rewritten
        slug = None
        m = re.search(r"opensea\.io/collection/([a-z0-9\-]+)", text_msg, flags=re.I)
        if m:
            slug = m.group(1)
        if not slug:
            m2 = re.search(r"(?:of|for)\s+([a-z0-9\- ]+)", text_msg, flags=re.I)
            if m2:
                slug = m2.group(1).strip().lower().replace(" ", "-")
        if not slug and req.params and isinstance(req.params.get("slug"), str):
            slug = str(req.params.get("slug")).strip()
        if not slug:
            reply_text = "Please provide a collection slug or link, e.g., https://opensea.io/collection/pudgypenguins"
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)

        try:
            client = OpenSeaClient()
            stats_data = await client.get_collection_stats(slug)
            logger.info("[Chat] Stats fetched for %s: %s", slug, list(stats_data.keys()) if isinstance(stats_data, dict) else "non-dict")
            
            # Generate natural language response using LLM
            responder = StatsResponder()
            reply_text = await responder.generate_response(req.message, slug, stats_data)
            
            # Also include structured data for frontend
            data = {
                "slug": slug, 
                "stats": stats_data, 
                "opensea_url": f"https://opensea.io/collection/{slug}"
            }
            
            _persist(db, req, rewritten, intent, reply_text, data, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text, data=data)
            
        except Exception as e:
            logger.error("[Chat] Error fetching stats for %s: %s", slug, e)
            reply_text = f"Sorry, I couldn't fetch statistics for {slug}. The collection might not exist or there could be an API issue."
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)

    raise HTTPException(status_code=400, detail="Unsupported intent")


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


class ChatMessageItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    data: Optional[Dict[str, Any]] = None


@router.get("/messages")
def get_messages(
    conversation_id: str,
    user_id: Optional[str] = None,
    wallet_address: Optional[str] = None,
    db: Session = Depends(get_db),
) -> list[ChatMessageItem]:
    if not conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id is required")
    if not user_id and wallet_address:
        user_id = _get_or_create_user_id_by_wallet(db, wallet_address)

    stmt = select(ConversationMessage).where(ConversationMessage.conversation_id == conversation_id)
    if user_id:
        stmt = stmt.where(ConversationMessage.user_id == user_id)
    stmt = stmt.order_by(ConversationMessage.created_at.asc())
    rows = db.execute(stmt).scalars().all()

    out: list[ChatMessageItem] = []
    for r in rows:
        if r.user_question:
            out.append(ChatMessageItem(role="user", content=r.user_question))
        if r.ai_answer:
            out.append(ChatMessageItem(role="assistant", content=r.ai_answer))
    return out




def to_dict(obj):
    # If you accidentally passed a stringified response, fix it here.
    if isinstance(obj, str):
        obj = obj.strip()
        # try to extract the JSON part if the string contains log prefixes
        if obj.startswith("{") or obj.startswith("["):
            return json.loads(obj)
        # naive fallback: find first '{'
        i = obj.find("{")
        if i != -1:
            return json.loads(obj[i:])
        raise ValueError("raw_data is a string but not JSON.")
    return obj

def extract_collections(raw_data):
    raw_data = to_dict(raw_data)

    # Handle nesting like {"data": {"collections": [...]}} if present
    candidate = raw_data
    if "collections" not in candidate and "data" in candidate and isinstance(candidate["data"], dict):
        candidate = candidate["data"]

    colls = candidate.get("collections", [])
    if isinstance(colls, dict):
        # Some APIs return an object keyed by id; normalize to list
        colls = list(colls.values())

    # Early diagnostics to catch shape issues fast
    assert isinstance(colls, list), f"`collections` should be a list, got {type(colls)}"

    formatted = []
    for c in colls:
        if not isinstance(c, dict):
            continue
        contracts = c.get("contracts") or []
        chain = contracts[0].get("chain", "") if contracts and isinstance(contracts, list) else ""
        slug = c.get("collection", "")
        opensea_url = f"https://opensea.io/collection/{slug}" if slug else (c.get("opensea_url") or "")
        formatted.append({
            "name": c.get("name", ""),
            "category": c.get("category", ""),
            "chain": chain,
            "opensea_url": opensea_url,
        })
    return formatted