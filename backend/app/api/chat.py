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
from ..services.collections_responder import CollectionsResponder
from ..core.database import get_db
import aiohttp
from ..models.models import ConversationMessage, User


router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger("scooby.chat")


class ChatRequest(BaseModel):
    intent: Optional[Literal["small_talk", "opensea_trending", "opensea_volume", "opensea_collections", "nft_statistics", "create_pool", "retrieve_pools", "pool_invest"]] = None
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
    logger.info("[Chat] Original: %r | Rewritten: %r", req.message, rewritten)

    # Check if we're already in a specific flow by looking at recent conversation history
    in_create_pool_flow = False
    in_nft_statistics_flow = False
    in_pool_invest_flow = False
    in_retrieve_pools_flow = False
    last_intent = None
    
    if req.conversation_id:
        # Get the last intent from the database
        if effective_user_id:
            last_msg_query = text("""
                SELECT intent FROM conversation_messages 
                WHERE conversation_id = :conv_id AND user_id = :user_id 
                AND intent IS NOT NULL
                ORDER BY created_at DESC LIMIT 1
            """)
            result = db.execute(last_msg_query, {
                "conv_id": req.conversation_id, 
                "user_id": effective_user_id
            }).fetchone()
            if result:
                last_intent = result[0]
        
        # Check assistant message keywords as backup
        if history_pairs:
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
                nft_statistics_keywords = [
                    "please provide the opensea collection link or slug",
                    "please provide a collection slug or link"
                ]
                
                # Check if user is explicitly requesting a different action
                user_msg_lower = req.message.lower()
                explicit_create_pool = any(phrase in user_msg_lower for phrase in [
                    "create a pool", "create pool", "make a pool", "new pool", "start pool creation"
                ])
                explicit_pool_invest = (("invest" in user_msg_lower or "deposit" in user_msg_lower or "fund" in user_msg_lower) and "pool" in user_msg_lower)
                explicit_nft_stats = any(phrase in user_msg_lower for phrase in [
                    "floor price", "statistics", "stats", "market cap", "volume", "price data"
                ])
                
                # If user explicitly requests different intent, allow intent switching
                if explicit_pool_invest:
                    logger.info("[Chat] User explicitly requested pool_invest, switching from %r", last_intent)
                    in_pool_invest_flow = True
                    in_create_pool_flow = False
                    in_nft_statistics_flow = False
                elif explicit_create_pool and last_intent != "create_pool":
                    logger.info("[Chat] User explicitly requested create_pool, switching from %r", last_intent)
                    # Don't force flow continuation, let classifier decide
                elif explicit_nft_stats and last_intent != "nft_statistics":
                    logger.info("[Chat] User explicitly requested nft_statistics, switching from %r", last_intent)
                    # Don't force flow continuation, let classifier decide
                # Primary check: use last intent if available and no explicit switch
                elif last_intent == "retrieve_pools" and not explicit_pool_invest and not explicit_create_pool:
                    # When last intent is retrieve_pools, we stay in that flow and do NOT
                    # fall into create_pool unless the user explicitly asks to create a pool.
                    in_retrieve_pools_flow = True
                elif last_intent == "pool_invest" and not explicit_create_pool and not explicit_nft_stats:
                    in_pool_invest_flow = True
                elif last_intent == "create_pool" and not explicit_nft_stats:
                    in_create_pool_flow = True
                elif last_intent == "nft_statistics" and not explicit_create_pool:
                    in_nft_statistics_flow = True
                # Fallback: check keywords in assistant message
                elif any(keyword in last_reply for keyword in create_pool_keywords):
                    in_create_pool_flow = True
                elif any(keyword in last_reply for keyword in nft_statistics_keywords):
                    in_nft_statistics_flow = True

    # Classify intent - stay in flow unless user cancels
    if in_pool_invest_flow and not any(w in req.message.lower() for w in ["cancel", "stop", "abort"]):
        intent = "pool_invest"
        logger.info("[Chat] Staying in pool_invest flow (last intent: %r)", last_intent)
    elif in_retrieve_pools_flow and not any(w in req.message.lower() for w in ["cancel", "stop", "abort"]):
        intent = "retrieve_pools"
        logger.info("[Chat] Staying in retrieve_pools flow (last intent: %r)", last_intent)
    elif in_create_pool_flow and not any(w in req.message.lower() for w in ["cancel", "stop", "abort"]):
        intent = "create_pool"
        logger.info("[Chat] Staying in create_pool flow (last intent: %r)", last_intent)
    elif in_nft_statistics_flow and not any(w in req.message.lower() for w in ["cancel", "stop", "abort"]):
        intent = "nft_statistics"
        logger.info("[Chat] Staying in nft_statistics flow (last intent: %r)", last_intent)
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

        # STRICT Q&A: Do not infer values opportunistically from arbitrary messages.
        # Values are only captured as answers to our explicit questions in this flow.
        pool_name = None
        opensea_link = None
        creator_fee = None
        buy_price = None
        sell_price = None
        logger.info("[Chat] Initialized create_pool fields to None for strict Q&A mode")

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

        # If user answered the current prompt, capture it
        if not opensea_link and last_assistant and "opensea collection link" in last_assistant:
            opensea_link = extract(r"https?://opensea\.io/collection/([a-z0-9\-]+)", req.message)
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
            "collection_slug": opensea_link.strip().split("/")[-1]
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
        
        # Generate natural language response using LLM
        responder = CollectionsResponder()
        reply_text = await responder.generate_trending_response(req.message, data, limit)
        
        _persist(db, req, rewritten, intent, reply_text, data, effective_user_id=effective_user_id)
        return ChatResponse(
            reply=reply_text,
        )

    if intent == "opensea_volume":
        params = req.params or {}
        days = int(params.get("days", 7))
        chain = params.get("chain")
        raw_data = await client.get_collections_by_volume(days=days, chain=chain)
        logger.info("[Chat] Volume fetched: params min=%s days=%s chain=%s", days, chain)

        logger.info("[Chat] Volume data fetched: %s", raw_data)
        
        # Generate natural language response using LLM
        responder = CollectionsResponder()
        reply_text = await responder.generate_volume_response(req.message, raw_data)

        logger.info("[Chat] Volume response: %s", reply_text)
        
        _persist(db, req, rewritten, intent, reply_text, raw_data, effective_user_id=effective_user_id)
        return ChatResponse(reply=reply_text)

    if intent == "opensea_collections":
        params = req.params or {}
        order_by = str(params.get("order_by", "market_cap"))
        order_direction = str(params.get("order_direction", "desc"))
        limit = int(params.get("limit", 50))
        chain = params.get("chain")
        raw_data = await client.get_collections(order_by=order_by, order_direction=order_direction, limit=limit, chain=chain)
        logger.info("[Chat] Collections fetched: order_by=%s direction=%s limit=%s chain=%s", order_by, order_direction, limit, chain)
        
        # Generate natural language response using LLM
        responder = CollectionsResponder()
        reply_text = await responder.generate_collections_response(req.message, raw_data, order_by, limit)

        _persist(db, req, rewritten, intent, reply_text, raw_data, effective_user_id=effective_user_id)
        return ChatResponse(reply=reply_text)

    if intent == "retrieve_pools":
        # Try to get a collection address directly from params
        params = req.params or {}
        address: str | None = params.get("address") if isinstance(params.get("address"), str) else None

        # If no address provided, ask user for OpenSea link and resolve slug → address
        if not address:
            # Check if the current message contains an OpenSea link; if not, prompt the user
            import re
            m = re.search(r"https?://opensea\.io/collection/([a-z0-9\-]+)", req.message, flags=re.I)
            if not m:
                reply_text = "Please share the OpenSea collection link so I can look up its pools."
                _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
                return ChatResponse(reply=reply_text)

            slug = m.group(1)
            client = OpenSeaClient()
            coll = await client.get_collection(slug)
            # Extract contract address from the collection response
            nft_address = ""
            try:
                contracts = coll.get("contracts") or (
                    coll.get("collection", {}).get("contracts") if isinstance(coll.get("collection"), dict) else []
                )
                if isinstance(contracts, list) and contracts:
                    for c in contracts:
                        if isinstance(c, dict) and c.get("address"):
                            nft_address = c.get("address")
                            break
            except Exception:
                nft_address = ""

            if not nft_address:
                reply_text = "I couldn't resolve the collection address from that link. Please try another link."
                _persist(db, req, rewritten, intent, reply_text, data=coll, effective_user_id=effective_user_id)
                return ChatResponse(reply=reply_text)
            address = nft_address

        # Call FE route to fetch pools for the collection address
        fe_base = os.getenv("FE_BASE_URL", "http://localhost:3002")
        url = f"{fe_base}/api/pools/collection/{address}"
        pools_data: dict | None = None
        try:
            headers = {
                "x-internal-call": "true"
            }
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as resp:
                    if resp.status == 200:
                        pools_data = await resp.json()
                    else:
                        txt = await resp.text()
                        reply_text = f"I couldn't fetch pools for that collection (status {resp.status})."
                        _persist(db, req, rewritten, intent, reply_text, data={"response": txt}, effective_user_id=effective_user_id)
                        return ChatResponse(reply=reply_text)
        except Exception as e:  # noqa: BLE001
            reply_text = f"Error calling pools API: {e}"
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)

        # Build a rich markdown reply with requested fields
        total = pools_data.get("totalPools") if isinstance(pools_data, dict) else None
        collection_addr = pools_data.get("collectionAddress", address) if isinstance(pools_data, dict) else address
        
        if total == 0:
            reply_text = f"## 🔍 No Pools Found\n\nNo pools are currently available for collection `{collection_addr}`.\n\n💡 *Want to be the first? You can create a new pool for this collection!*"
        else:
            reply_lines = [
                f"## 🏊‍♂️ Available Pools ({total} found)",
                f"*Collection: `{collection_addr}`*\n"
            ]
            
            try:
                items = (pools_data or {}).get("pools", [])
                for i, p in enumerate(items[:5], 1):  # Show max 5 pools
                    name = p.get("name") or "Unnamed Pool"
                    pool_id = p.get("id", "N/A")
                    buy_price = p.get("buyPriceETH", "0.000000")
                    sell_price = p.get("sellPriceETH", "0.000000") 
                    participants = (p.get("stats") or {}).get("totalParticipants", 0)
                    contribution = p.get("totalContribution", 0.0)
                    creator_name = (p.get("creator") or {}).get("name") or "Anonymous"
                    status = p.get("status", "UNKNOWN").title()
                    
                    # Format contribution with proper units
                    contrib_str = f"{contribution:.2f} ETH" if contribution > 0 else "No contributions yet"
                    
                    # Status emoji
                    status_emoji = {"Funding": "🟡", "Active": "🟢", "Closed": "🔴"}.get(status, "⚪")
                    
                    reply_lines.extend([
                        f"### {i}. **{name}** {status_emoji}",
                        f"📊 **Buy:** {buy_price} ETH • **Sell:** {sell_price} ETH",
                        f"👥 **{participants} participants** • 💰 **{contrib_str}**",
                        f"🏗️ *Created by {creator_name}* • ID: `{pool_id}`",
                        ""  # Empty line for spacing
                    ])
                
                if total > 5:
                    reply_lines.append(f"*...and {total - 5} more pools available*")
                    
            except Exception as e:
                reply_lines.append(f"*Error formatting pool data: {e}*")
            
            reply_lines.extend([
                "",
                "🎯 **Ready to invest?** Choose a pool and start participating!"
            ])
            
            reply_text = "\n".join(reply_lines)
        _persist(db, req, rewritten, intent, reply_text, data=pools_data, effective_user_id=effective_user_id)
        return ChatResponse(reply=reply_text, data=pools_data)

    if intent == "nft_statistics":
        # Check for cancellation
        if any(w in req.message.lower() for w in ["cancel", "stop", "abort"]):
            reply_text = "Okay, I've cancelled the NFT statistics request."
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)
        
        # Get conversation history for this conversation to check if we already asked for OpenSea link
        history_pairs = []
        if req.conversation_id:
            history_msgs = db.execute(
                text("SELECT user_question, ai_answer as assistant_reply FROM conversation_messages WHERE conversation_id = :conv_id ORDER BY created_at ASC"),
                {"conv_id": req.conversation_id}
            ).fetchall()
            for msg in history_msgs:
                if msg[0] and msg[1]:  # user_question and assistant_reply
                    history_pairs.append(f"User: {msg[0]}\nAssistant: {msg[1]}")
        
        # Check if we already asked for OpenSea link in this conversation
        asked_for_link = False
        if history_pairs:
            last_pair = history_pairs[-1] if history_pairs else ""
            if "Assistant:" in last_pair:
                last_reply = last_pair.split("Assistant:", 1)[1].strip().lower()
                asked_for_link = "please provide the opensea collection link or slug" in last_reply
        
        # Try to get a collection slug from the current message
        import re
        text_msg = req.message  # Use original message, not rewritten
        slug = None
        m = re.search(r"opensea\.io/collection/([a-z0-9\-]+)", text_msg, flags=re.I)
        if m:
            slug = m.group(1)
            logger.info("[Chat] Extracted slug from OpenSea URL: %s", slug)
        
        # If no slug found and we haven't asked for link yet, ask for it
        if not slug and not asked_for_link:
            reply_text = "Please provide the OpenSea collection link or slug (e.g., https://opensea.io/collection/pudgypenguins) and I'll fetch the statistics for you."
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)
        
        # If no slug found but we already asked, give error
        if not slug and asked_for_link:
            reply_text = "I couldn't find a valid OpenSea collection link in your message. Please provide a link like https://opensea.io/collection/pudgypenguins"
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)

        # We have a slug, fetch the stats
        try:
            client = OpenSeaClient()
            stats_data = await client.get_collection_stats(slug)
            logger.info("[Chat] Stats fetched for %s: %s", slug, list(stats_data.keys()) if isinstance(stats_data, dict) else "non-dict")
            
            # Generate natural language response using LLM
            responder = StatsResponder()
            # Use the original user question from history if available
            original_question = req.message
            if history_pairs and len(history_pairs) >= 1:
                first_pair = history_pairs[0]
                if "User:" in first_pair:
                    original_question = first_pair.split("User:", 1)[1].split("\nAssistant:", 1)[0].strip()
            
            reply_text = await responder.generate_response(original_question, slug, stats_data)
            
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

    # Handle pool investment flow
    if intent == "pool_invest":
        import re
        last_assistant = None
        history_pairs: list[str] = []
        if req.conversation_id:
            history_msgs = db.execute(
                text("SELECT user_question, ai_answer FROM conversation_messages WHERE conversation_id = :c ORDER BY created_at ASC"),
                {"c": req.conversation_id}
            ).fetchall()
            for m in history_msgs:
                if m[0] and m[1]:
                    history_pairs.append(f"User: {m[0]}\nAssistant: {m[1]}")
            if history_pairs:
                last_pair = history_pairs[-1]
                if "Assistant:" in last_pair:
                    last_assistant = last_pair.split("Assistant:", 1)[1].strip().lower()

        def extract_pool_id(message: str) -> str | None:
            # Accept explicit patterns like "pool id: <id>" and bare IDs
            m = re.search(r"pool[_\- ]?id[:\s]*([a-zA-Z0-9_\-]+)", message, flags=re.I)
            if m:
                return m.group(1)
            # If the whole message looks like an id, use it directly
            bare = message.strip()
            if re.match(r"^[a-zA-Z0-9_\-]{8,}$", bare):
                return bare
            return None

        def extract_amount(message: str) -> float | None:
            m = re.search(r"([0-9]+(?:[\.,][0-9]+)?)", message)
            if not m:
                return None
            return float(m.group(1).replace(",", "."))

        pool_id = None
        amount = None
        if last_assistant and ("how much" in last_assistant or "amount" in last_assistant):
            amount = extract_amount(req.message)
        elif last_assistant and ("pool id" in last_assistant or "pool_id" in last_assistant or "which pool" in last_assistant):
            pool_id = extract_pool_id(req.message) or req.message.strip()
        else:
            # Even if the last assistant didn't ask, try to capture a bare id
            pool_id = extract_pool_id(req.message) or pool_id

        # Walk through conversation turns to backfill values similar to create_pool flow
        conversation_turns: list[tuple[str, str]] = []
        for pair in history_pairs:
            if "User:" in pair and "Assistant:" in pair:
                parts = pair.split("User:", 1)[1]
                if "Assistant:" in parts:
                    user_msg = parts.split("Assistant:", 1)[0].strip()
                    assistant_msg = parts.split("Assistant:", 1)[1].strip().lower()
                    conversation_turns.append((user_msg, assistant_msg))

        for i, (user_msg, assistant_msg) in enumerate(conversation_turns):
            if ("pool id" in assistant_msg or "pool_id" in assistant_msg or "which pool" in assistant_msg) and not pool_id:
                next_user = conversation_turns[i + 1][0] if i + 1 < len(conversation_turns) else req.message
                pool_id = extract_pool_id(next_user) or pool_id
            if ("how much" in assistant_msg or "amount" in assistant_msg) and amount is None:
                next_user = conversation_turns[i + 1][0] if i + 1 < len(conversation_turns) else req.message
                amount = extract_amount(next_user) if amount is None else amount

        if not pool_id:
            reply_text = "To invest, please provide the pool_id you want to invest in."
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)

        if amount is None:
            reply_text = "How much do you want to invest? Provide the amount in ETH (e.g., 0.25)."
            _persist(db, req, rewritten, intent, reply_text, effective_user_id=effective_user_id)
            return ChatResponse(reply=reply_text)

        fe_base = os.getenv("FE_BASE_URL", "http://localhost:3002")
        url = f"{fe_base}/api/pool/invest"
        invest_payload = {"poolId": pool_id, "amount": amount, "wallet_address": req.wallet_address}
        logger.info("[Chat] Invest payload: %s", invest_payload)
        try:
            headers = {
                "Content-Type": "application/json",
                "x-internal-call": "true"
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=invest_payload, headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        reply_text = "✅ Investment submitted successfully."
                        _persist(db, req, rewritten, intent, reply_text, data=data, effective_user_id=effective_user_id)
                        return ChatResponse(reply=reply_text, data=data)
                    else:
                        txt = await resp.text()
                        reply_text = f"❌ Failed to invest (status {resp.status}). {txt}"
                        _persist(db, req, rewritten, intent, reply_text, data=invest_payload, effective_user_id=effective_user_id)
                        return ChatResponse(reply=reply_text)
        except Exception as e:
            reply_text = f"Error calling invest API: {e}"
            _persist(db, req, rewritten, intent, reply_text, data=invest_payload, effective_user_id=effective_user_id)
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