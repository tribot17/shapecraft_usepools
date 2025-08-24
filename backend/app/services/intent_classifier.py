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

        def heuristic(msg: str) -> Intent:
            t = msg.lower()
            if any(k in t for k in ["create a pool", "create pool", "new pool", "launch pool"]):
                return "create_pool"
            if any(k in t for k in ["trending", "24h", "24 h", "last 24"]):
                return "opensea_trending"
            if any(k in t for k in ["volume", "7d volume", "3m volume", "five days", "5 days"]):
                return "opensea_volume"
            if any(k in t for k in ["market cap", "num owners", "owners", "floor price", "collections with"]):
                return "opensea_collections"
            return "small_talk"

        if not self.client:
            return heuristic(text)

        system = (
            "You are an intent classifier for the Scooby NFT assistant. "
            "Respond with JSON ONLY, matching this schema: {\"intent\": <one-of>}. "
            "Allowed values for intent: small_talk, opensea_trending, opensea_volume, opensea_collections, create_pool."

            "opensea_trending is for queries about trending collections in ~24h. "
            "opensea_volume is for queries about collection volume over N days. "
            "opensea_collections is for custom sorting or filters like market cap, num owners, floor change. "
            "create_pool is for queries about creating a pool."

            "Examples:"
            "Can you create a pool? -> create_pool"
            "What are NFTs? -> small_talk"
            "How can I better trade NFTs? -> small_talk"
            "What are the trending collections? -> opensea_trending"
            "What are the collections with the highest volume? -> opensea_volume"
            "What are the collections with the highest market cap? -> opensea_collections"
            "What are the collections with the highest floor price? -> opensea_collections"
            "What are the collections with the highest number of owners? -> opensea_collections"
        )
        
        user_msg = (
            "Classify the following user message into one intent. "
            "Return ONLY a JSON object with a single key 'intent'.\n\n"
            f"Message: {text!r}"
        )

        try:
            resp = self.client.chat.completions.create(
                model="gpt-4o-mini",
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
            logging.info(f"Intent classifier parsed: {parsed.intent}")
            return parsed.intent
        except (json.JSONDecodeError, ValidationError, Exception) as e:  # noqa: BLE001
            logging.warning(f"Intent clf fallback due to error: {e}")
            return heuristic(text)


