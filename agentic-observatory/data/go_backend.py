from __future__ import annotations

import httpx
from typing import Any
from config import settings

class GoBackendClient:
    def __init__(self):
        self.base_url = settings.GO_BACKEND_URL.rstrip("/")
        self.client = httpx.AsyncClient(timeout=15.0)

    async def get(self,endpoint: str,params: dict[str, Any] | None = None) -> dict[str, Any]:
        response = await self.client.get(
            f"{self.base_url}{endpoint}",
            params=params,
        )
        response.raise_for_status()
        return response.json()

    async def get_dashboard_stats(self):
        return await self.get("/api/dashboard/stats")

    async def list_backups(self, page: int = 1, limit: int = 50):
        return await self.get(
            "/api/backups",
            {"page": page, "limit": limit},
        )

    async def get_latest_backup(self):
        return await self.get("/api/backups/latest")

    async def get_backup_details(self, backup_id: int):
        return await self.get(f"/api/backups/{backup_id}")

    async def get_metrics(self,days: int = 30,page: int = 1,limit: int = 50):
        return await self.get(
            "/api/metrics",
            {
                "days": days,
                "page": page,
                "limit": limit,
            },
        )

    async def list_analytics_history(self,page: int = 1,limit: int = 50):
        return await self.get(
            "/api/analytics",
            {
                "page": page,
                "limit": limit,
            },
        )

    async def get_latest_analytics(self):
        return await self.get("/api/analytics/latest")

    async def get_analytics_for_run(self, run_id: int):
        return await self.get(f"/api/analytics/run/{run_id}")

    async def list_repos(self,page: int = 1,limit: int = 50):
        return await self.get(
            "/api/repos",
            {
                "page": page,
                "limit": limit,
            },
        )

    async def list_logs(self,page: int = 1,limit: int = 100,level: str | None = None,run_id: int | None = None):
        params = {
            "page": page,
            "limit": limit,
        }

        if level:
            params["level"] = level

        if run_id:
            params["run_id"] = run_id

        return await self.get("/api/logs", params)

client = GoBackendClient()

# python tries to evaluate User immediately while the class is still being created.
# class User:
#     manager: User  # NameError

# Python stores annotations as strings internally
# so forward references work automatically.
# from __future__ import annotations

# class User:
#     manager: User