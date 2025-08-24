from __future__ import annotations

from typing import Literal

from openai import OpenAI

from ..core.config import settings


Intent = Literal["small_talk", "opensea_trending", "opensea_volume", "opensea_collections"]


class LLMIntentClassifier:
    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or getattr(settings, "OPENAI_API_KEY", None) or getattr(settings, "openai_api_key", None)
        if not key:
            self.client = None
        else:
            self.client = OpenAI(api_key=key)

    async def classify(self, text: str) -> Intent:
        # Fallback heuristic if no OpenAI key available
        if not self.client:
            t = text.lower()
            if any(w in t for w in ["trending", "24h", "24 h", "last 24"]):
                return "opensea_trending"
            if any(w in t for w in ["volume", "3m", "5 days", "five days"]):
                return "opensea_volume"
            return "small_talk"

        system = (
            "You are an intent classifier for an NFT assistant named Scooby. "
            "Return ONLY one of: small_talk, opensea_trending, opensea_volume, opensea_collections. "
            "small_talk is for greetings or generic questions. "
            "opensea_trending is for queries about trending collections in ~24h. "
            "opensea_volume is for queries about collection volume over N days. "
            "opensea_collections is for custom sorting or filters like market cap, num owners, floor change."
        )
        user = f"Classify this user message into an intent: {text!r}. Return only the label."

        resp = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0,
            max_tokens=4,
        )
        label = resp.choices[0].message.content.strip().lower()
        if label in {"small_talk", "opensea_trending", "opensea_volume"}:
            return label  # type: ignore[return-value]
        return "small_talk"


