from __future__ import annotations

from typing import List

from openai import OpenAI

from ..core.config import settings


NFT_KNOWLEDGE_BASE = (
    "NFTs (Non-Fungible Tokens) are unique digital assets on blockchains like Ethereum, "
    "Solana, and Polygon. They represent ownership of digital items such as art, collectibles, "
    "music, gaming assets, memberships, or utility passes. Key market factors include floor price, "
    "trading volume, liquidity, holder distribution, listing trends, sales velocity, price action, "
    "social metrics, utility, team quality, rarity, and overall market sentiment. Categories include "
    "PFPs, collectibles, gaming assets, art, membership/utility passes, music NFTs, metaverse land, "
    "and financial/tokenized NFTs. Common strategies: flipping on short-term catalysts, swing trading, "
    "long-term investing in strong teams/IP, accumulation during low-volume periods, and distribution "
    "awareness to avoid FOMO entries when whales exit."
    "pools are a way to fractionalize NFTs by co-investing in them with other users."
)


class SmallTalkResponder:
    """Generates small-talk replies for Scooby with an NFT focus.

    If an OpenAI API key is configured, uses the LLM; otherwise, returns a concise
    fallback response that nudges the user toward NFT-related questions.
    """

    SYSTEM_PROMPT = (
        "You are Scooby, an upbeat NFT companion. You only talk about NFTs and related market topics.\n"
        "Decline to answer unrelated topics and encourage questions about NFTs.\n\n"
        f"KNOWLEDGE BASE (use to inform responses):\n{NFT_KNOWLEDGE_BASE}\n\n"
        "Guidelines:\n"
        "- Be friendly and concise (1-3 sentences).\n"
        "- If the user is off-topic (not NFTs/markets/collections/trading), say you can only discuss NFTs and suggest a relevant NFT question.\n"
        "- When on-topic, provide helpful, practical pointers and suggest a next question (e.g., trending collections, volume leaders, floor price changes).\n"
        "- For greetings or generic questions, reply friendly with a smiley face.\n"

        "Additional rules:\n"
        "- If the user asks for a given NFT collection, encourage them to create a pool for it to buy fractionalized shares of the collection with other users."
    )

    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or getattr(settings, "OPENAI_API_KEY", None) or getattr(settings, "openai_api_key", None)
        self.client = OpenAI(api_key=key) if key else None

    async def respond(self, user_message: str, history_pairs: List[str] | None = None) -> str:

        history_text = "\n\n".join((history_pairs or [])[-6:])
        user_prompt = (
            (f"Recent chat (oldest→newest):\n{history_text}\n\n" if history_text else "")
            + f"User message: {user_message!r}\n"
            + "Respond now following the guidelines."
        )

        resp = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.6,
            max_tokens=160,
        )
        return resp.choices[0].message.content.strip()


