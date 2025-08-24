from __future__ import annotations

import json
import logging
from typing import Any, Dict

from openai import OpenAI

from ..core.config import settings

logger = logging.getLogger("scooby.stats_responder")


class StatsResponder:
    """Generate natural language responses from NFT collection statistics."""
    
    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or getattr(settings, "OPENAI_API_KEY", None) or getattr(settings, "openai_api_key", None)
        if not key:
            self.client = None
        else:
            self.client = OpenAI(api_key=key)

    async def generate_response(self, user_question: str, collection_slug: str, stats_data: Dict[str, Any]) -> str:
        """Generate a natural language response from stats data.
        
        Args:
            user_question: The original user question
            collection_slug: The collection slug being queried
            stats_data: The raw stats JSON from OpenSea API
            
        Returns:
            Natural language response summarizing the stats
        """
        if not self.client:
            return self._fallback_response(collection_slug, stats_data)
        
        try:
            # Extract key stats for the prompt
            total_stats = stats_data.get("total", {})
            intervals = stats_data.get("intervals", [])
            one_day_stats = next((interval for interval in intervals if interval.get("interval") == "one_day"), {})
            
            system_prompt = (
                "You are an NFT statistics expert. Generate a concise, informative response about NFT collection statistics. "
                "Be conversational and highlight the most relevant information based on the user's question. "
                "Use proper formatting for numbers (e.g., '2.5 ETH', '1,234 owners'). "
                "Keep responses under 150 words and focus on what the user specifically asked about."
            )
            
            user_prompt = (
                f"User asked: '{user_question}'\n"
                f"Collection: {collection_slug}\n"
                f"Statistics data: {json.dumps(stats_data, indent=2)}\n\n"
                f"Generate a natural, conversational response that answers their question using this data."
            )
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=200
            )
            
            reply = response.choices[0].message.content or ""
            logger.info("[StatsResponder] Generated response for %s: %s", collection_slug, reply[:100])
            return reply.strip()
            
        except Exception as e:
            logger.warning("[StatsResponder] LLM failed, using fallback: %s", e)
            return self._fallback_response(collection_slug, stats_data)
    
    def _fallback_response(self, collection_slug: str, stats_data: Dict[str, Any]) -> str:
        """Fallback response when LLM is unavailable."""
        total_stats = stats_data.get("total", {})
        
        floor_price = total_stats.get("floor_price", 0)
        num_owners = total_stats.get("num_owners", 0)
        market_cap = total_stats.get("market_cap", 0)
        
        # Format numbers nicely
        floor_str = f"{floor_price} ETH" if floor_price else "N/A"
        owners_str = f"{num_owners:,}" if num_owners else "N/A"
        
        return (
            f"Stats for {collection_slug}: "
            f"Floor price: {floor_str} • "
            f"Owners: {owners_str} • "
            f"Market cap: {market_cap}"
        )
