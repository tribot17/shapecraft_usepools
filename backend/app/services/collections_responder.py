from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

from openai import OpenAI

from ..core.config import settings

logger = logging.getLogger("scooby.collections_responder")


class CollectionsResponder:
    """Generate natural language responses from NFT collections data (volume/trending/collections)."""
    
    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or getattr(settings, "OPENAI_API_KEY", None) or getattr(settings, "openai_api_key", None)
        if not key:
            self.client = None
        else:
            self.client = OpenAI(api_key=key)

    async def generate_volume_response(self, user_question: str, raw_data: Dict[str, Any]) -> str:
        """Generate a natural language response from volume data.
        
        Args:
            user_question: The original user question
            raw_data: The raw volume JSON from OpenSea API
            min_volume: Minimum volume filter used
            days: Days filter used
            
        Returns:
            Natural language response summarizing the volume data
        """
        
        try:
            system_prompt = (
                "You are an NFT market analyst. Generate a beautifully formatted response using markdown styling. "
                "Use emojis, bold text, and proper formatting to make the response visually appealing. "
                "Structure your response as follows:\n"
                "1. Start with an engaging title using ## and relevant emojis\n"
                "2. List the names of the top collections with numbered format, using **bold** for collection names\n"
                "4. End with a call-to-action about creating pools using emojis and formatting\n"
                "5. Mention the data is sorted by volume in descending order\n"
                "6. Do not include URLs in the response\n"
                "Make it engaging and visually striking!"
            )
            
            user_prompt = (
                f"User asked: '{user_question}'\n"
                f"Collections data: {raw_data}\n\n"
            )
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            reply = response.choices[0].message.content or ""
            logger.info("[CollectionsResponder] Generated volume response: %s", reply[:100])
            return reply.strip()
            
        except Exception as e:
            logger.warning("[CollectionsResponder] LLM failed for volume: %s", e)

    async def generate_collections_response(self, user_question: str, raw_data: Dict[str, Any], order_by: str, limit: int) -> str:
        """Generate a natural language response from collections data.
        
        Args:
            user_question: The original user question
            raw_data: The raw collections JSON from OpenSea API
            order_by: Sorting criteria used
            limit: Number of collections limit
            
        Returns:
            Natural language response summarizing the collections data
        """
        if not self.client:
            return f"Found collections data ordered by {order_by}. OpenAI client not configured."
        
        try:
            system_prompt = (
                "You are an NFT market analyst. Generate a beautifully formatted response using markdown styling. "
                "Use emojis, bold text, and proper formatting to make the response visually appealing. "
                "Structure your response as follows:\n"
                "1. Start with an engaging title using ## and relevant emojis\n"
                "2. List the top collections with numbered format, using **bold** for collection names\n"
                "3. Add relevant emojis for each collection (🚀 for top performers, 💎 for valuable, ⭐ for popular)\n"
                "4. Include OpenSea URLs as clickable links: [Collection Name](URL)\n"
                "5. Add brief insights about market cap, volume, or notable features\n"
                "6. End with a call-to-action about exploring these collections\n"
                "Make it engaging and visually striking!"
            )
            
            user_prompt = (
                f"User asked: '{user_question}'\n"
                f"Query: Top {limit} collections ordered by {order_by}\n"
                f"Collections data: {json.dumps(raw_data, indent=2)}\n\n"
                f"Generate a natural, conversational response that highlights the top collections and trends."
            )
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            reply = response.choices[0].message.content or ""
            logger.info("[CollectionsResponder] Generated collections response: %s", reply[:100])
            return reply.strip()
            
        except Exception as e:
            logger.warning("[CollectionsResponder] LLM failed for collections: %s", e)
            return f"Found collections data ordered by {order_by}. Check the raw data for detailed information."

    async def generate_trending_response(self, user_question: str, data: List[Dict[str, Any]], limit: int) -> str:
        """Generate a natural language response from trending data.
        
        Args:
            user_question: The original user question
            data: The trending collections data
            limit: Number of collections limit
            
        Returns:
            Natural language response summarizing the trending data
        """
        if not self.client:
            return f"Found {len(data)} trending collections. OpenAI client not configured."
        
        try:
            system_prompt = (
                "You are an NFT trend analyst. Generate a beautifully formatted response using markdown styling. "
                "Use emojis, bold text, and proper formatting to make the response visually appealing. "
                "Structure your response as follows:\n"
                "1. Start with an engaging title using ## and trending emojis (📈, 🔥, ⚡)\n"
                "2. List the trending collections with numbered format, using **bold** for collection names\n"
                "3. Add relevant trending emojis for each collection (🔥 for hot, 📈 for rising, 💥 for explosive)\n"
                "4. Include brief insights about 24h volume trends and momentum\n"
                "5. End with a call-to-action about creating pools for trending collections\n"
                "6. Use proper number formatting (e.g., '2.5K ETH', '1,234 sales')\n"
                "Make it exciting and visually striking to capture the trending momentum!"
            )
            
            user_prompt = (
                f"User asked: '{user_question}'\n"
                f"Query: Top {limit} trending collections by 24h volume\n"
                f"Found {len(data)} trending collections\n"
                f"Trending data: {json.dumps(data, indent=2)}\n\n"
                f"Generate a natural, conversational response that captures the trending excitement."
            )
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            reply = response.choices[0].message.content or ""
            logger.info("[CollectionsResponder] Generated trending response: %s", reply[:100])
            return reply.strip()
            
        except Exception as e:
            logger.warning("[CollectionsResponder] LLM failed for trending: %s", e)
            return f"Found {len(data)} trending collections. Check the raw data for detailed information."
    
