from __future__ import annotations

from typing import List
import logging

from openai import OpenAI

from ..core.config import settings


class QueryRewriter:
    """Rewrites user queries using conversation context for Scooby (NFT assistant).

    Falls back to a simple pass-through if OpenAI is not configured.
    """

    SYSTEM_PROMPT = (
        "You are a query rewriter for an NFT assistant bot named Scooby. "
        "Your job is to rewrite user queries to be clear, complete, and contextual.\n\n"
        "Rules:\n"
        "1. Fix grammar and spelling errors\n"
        "2. Add missing context from conversation history\n"
        "3. Convert relative times to absolute ones when possible (e.g., 'last 24h' -> 'past 24 hours')\n"
        "4. Make collection, marketplace, and chain references explicit if implied\n"
        "5. Preserve the user's original intent\n"
        "6. Keep the rewritten query concise but complete\n"
        "7. If the query references earlier messages, make them explicit in the rewrite\n"
    )

    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or getattr(settings, "OPENAI_API_KEY", None) or getattr(settings, "openai_api_key", None)
        self.client = OpenAI(api_key=key) if key else None
        self.logger = logging.getLogger("scooby.query_rewriter")

    async def rewrite(self, user_question: str, history_pairs: List[str]) -> str:
        """Return a rewritten query. history_pairs is a list like ["User: ...\nAssistant: ...", ...]."""
        if not self.client:
            self.logger.info("[QueryRewriter] No OpenAI key; returning original question")
            return user_question.strip()

        history_text = "\n\n".join(history_pairs[-10:])  # limit prompt size
        prompt_user = (
            f"Conversation history (oldest -> newest):\n{history_text}\n\n"
            f"Rewrite the latest user query clearly and contextually.\n"
            f"User query: {user_question!r}"
        )

        self.logger.info("[QueryRewriter] Input: %r", user_question)
        self.logger.info("[QueryRewriter] History size: %d", len(history_pairs))

        resp = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": prompt_user},
            ],
            temperature=0,
            max_tokens=200,
        )
        rewritten = resp.choices[0].message.content.strip()
        self.logger.info("[QueryRewriter] Rewritten: %r", rewritten)
        return rewritten


