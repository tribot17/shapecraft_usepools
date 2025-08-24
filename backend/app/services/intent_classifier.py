from __future__ import annotations

from typing import Literal

from openai import OpenAI
from pydantic import BaseModel, ValidationError
import json

from ..core.config import settings
import logging


Intent = Literal[
    "small_talk",
    "opensea_trending",
    "opensea_volume",
    "opensea_collections",
    "create_pool",
    "nft_statistics",
]


class IntentResult(BaseModel):
    intent: Intent


class LLMIntentClassifier:
    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or getattr(settings, "OPENAI_API_KEY", None) or getattr(settings, "openai_api_key", None)
        if not key:
            self.client = None
        else:
            self.client = OpenAI(api_key=key)

    async def classify(self, text: str) -> Intent:
        """Classify text into an intent using structured JSON output.

        Falls back to a robust keyword heuristic if the LLM output is invalid.
        """

        system = (
            "You are an intent classifier for the Scooby NFT assistant. "
            "Respond with JSON ONLY, matching this schema: {\"intent\": <one-of>}. "
            "Allowed values for intent: [small_talk, opensea_trending, opensea_volume, opensea_collections, create_pool, nft_statistics]. "

            "Rules:\n"
            "- Any request about creating a pool, starting a pool, or making a pool → intent = create_pool.\n"
            "- Queries about trending collections (last ~24h) → opensea_trending.\n"
            "- Queries about collection volume over N days → opensea_volume.\n"
            "- Queries about sorting/filtering collections lists by metrics (market cap, num owners, floor change, etc.) → opensea_collections.\n"
            "- Queries for stats of a specific collection (e.g., \"floor price of <collection>\", \"stats for <collection>\") → nft_statistics.\n"
            "- Generic questions about NFTs, greetings  or generic questions → small_talk.\n"

            "Examples:\n"
            "Can you create a pool? -> {\"intent\": \"create_pool\"}\n"
            "I want to create a pool -> {\"intent\": \"create_pool\"}\n"
            "Help me start a pool -> {\"intent\": \"create_pool\"}\n"
            "What are NFTs? -> {\"intent\": \"small_talk\"}\n"
            "How can I better trade NFTs? -> {\"intent\": \"small_talk\"}\n"
            "What are the trending collections? -> {\"intent\": \"opensea_trending\"}\n"
            "What are the collections with the highest volume? -> {\"intent\": \"opensea_volume\"}\n"
            "What are the collections with the highest market cap? -> {\"intent\": \"opensea_collections\"}\n"
            "What are the collections with the highest floor price? -> {\"intent\": \"opensea_collections\"}\n"
            "What are the collections with the highest number of owners? -> {\"intent\": \"opensea_collections\"}\n"
            "what's the floor price of Pudgy Penguins? -> {\"intent\": \"nft_statistics\"}\n"
        )

        user_msg = (
            "Classify the following user message into one intent. "
            "Return ONLY a JSON object with a single key 'intent'.\n\n"
            f"Message: {text!r}"
        )

        if "create" in text.lower() and "pool" in text.lower():
            logging.info(f"Intent classifier heuristic: create_pool (matched 'create' + 'pool' in '{text}')")
            return "create_pool"

        try:
           
            resp = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0,
                response_format={"type": "json_object"},
                max_tokens=20,
            )
            raw = resp.choices[0].message.content or "{}"
            data = json.loads(raw)
            parsed = IntentResult.model_validate(data)
            logging.info(f"Intent classifier LLM result: {parsed.intent}")
            return parsed.intent
        except (json.JSONDecodeError, ValidationError, Exception) as e:  # noqa: BLE001
            logging.warning(f"Intent clf fallback due to error: {e}")
            # Final fallback - check for create_pool again
            if "create" in text.lower() and "pool" in text.lower():
                logging.info(f"Intent classifier error fallback: create_pool")
                return "create_pool"
            # Heuristic for nft_statistics: mentions floor price/stats for a specific collection
            tl = text.lower()
            if ("floor" in tl and "price" in tl) or "nft stats" in tl or "statistics" in tl or "stats" in tl:
                return "nft_statistics"
            return "small_talk"
