from __future__ import annotations

import aiohttp
import logging
from typing import Any, Dict, Optional

from ..core.config import settings

logger = logging.getLogger("scooby.opensea")


class OpenSeaClient:
    def __init__(self, api_key: Optional[str] = None, base_url: str | None = None) -> None:
        self.base_url = base_url or settings.OPENSEA_BASE_URL
        self.api_key = api_key or settings.OPENSEA_API_KEY

    def _headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {"accept": "application/json"}
        if self.api_key:
            headers["x-api-key"] = self.api_key
        return headers

    async def _get(self, path: str, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        logger.info("[OpenSea] GET %s | params: %r", url, params or {})
        async with aiohttp.ClientSession(headers=self._headers()) as session:
            async with session.get(url, params=params) as resp:
                resp.raise_for_status()
                data = await resp.json()
                logger.info("[OpenSea] Response status: %d | data keys: %r", resp.status, list(data.keys()) if isinstance(data, dict) else "non-dict")
                logger.info("[OpenSea] Response data: %r", data)
                return data

    async def get_trending_collections(self, limit: int = 25, chain: str | None = None) -> Dict[str, Any]:
        # Use supported fields. For "trending" signal, one_day_change is available per docs.
        params: Dict[str, Any] = {
            "order_by": "one_day_change",
            "order_direction": "desc",
            "limit": str(limit),
        }
        if chain:
            params["chain"] = chain
        return await self._get("/collections", params)

    async def get_collections_by_volume(self, min_volume_eth: float, days: int = 7, limit: int = 50, chain: str | None = None) -> Dict[str, Any]:
        # Per docs, supported order_by for volume is seven_day_volume.
        params: Dict[str, Any] = {
            "order_by": "seven_day_volume",
            "order_direction": "desc",
            "limit": str(limit),
        }
        if chain:
            params["chain"] = chain

        data = await self._get("/collections", params)
        # Filter client-side using seven_day_volume as proxy for requested days threshold
        collections = data.get("collections", data.get("data", []))
        filtered: list[Any] = []
        for c in collections:
            stats = c.get("stats") or {}
            vol = stats.get("seven_day_volume")
            try:
                if vol is not None and float(vol) >= float(min_volume_eth):
                    filtered.append(c)
            except Exception:
                continue
        return {"collections": filtered}

    async def get_collections(
        self,
        *,
        order_by: str,
        order_direction: str = "desc",
        limit: int = 50,
        chain: str | None = None,
    ) -> Dict[str, Any]:
        # Supported order_by fields per docs:
        # created_date, market_cap, num_owners, one_day_change, seven_day_change, seven_day_volume
        allowed = {
            "created_date",
            "market_cap",
            "num_owners",
            "one_day_change",
            "seven_day_change",
            "seven_day_volume",
        }
        if order_by not in allowed:
            raise ValueError(f"Unsupported order_by: {order_by}")

        params: Dict[str, Any] = {
            "order_by": order_by,
            "order_direction": order_direction,
            "limit": str(limit),
        }
        if chain:
            params["chain"] = chain

        return await self._get("/collections", params)

    async def get_collection(self, slug: str) -> Dict[str, Any]:
        """Fetch details for a single collection by slug.

        The OpenSea v2 API supports: GET /collections/{collection_slug}
        """
        slug = slug.strip().split("/")[-1]
        if not slug:
            raise ValueError("Invalid collection slug")
        return await self._get(f"/collections/{slug}")

    async def get_collection_stats(self, slug: str) -> Dict[str, Any]:
        """Fetch statistics for a collection.

        The v2 endpoint returns stats as part of the collection payload in many cases.
        Prefer the `/collections/{slug}` endpoint and extract `stats`.
        """
        data = await self.get_collection(slug)
        # Depending on the response shape, stats might be at top-level or nested
        if isinstance(data, dict):
            if isinstance(data.get("collection"), dict) and data["collection"].get("stats"):
                return data["collection"]["stats"]
            if data.get("stats"):
                return data["stats"]
        return {}


