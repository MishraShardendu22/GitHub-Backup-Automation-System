from data import client
from typing import Annotated, Any
from langchain_core.tools import tool


@tool
async def list_tracked_repositories(
    page: Annotated[int, "Page number"] = 1,
    limit: Annotated[int, "Results per page"] = 50,
) -> dict[str, Any]:
    """List tracked GitHub repositories in the backup system.

    Use when asking about repository growth, size, activity, or tracked repository lists.
    Examples:
    - "List all tracked repositories."
    - "Show repository activity for the backup system."
    - "Get tracked repo growth details."
    - "Retrieve repositories page by page."
    - "What repositories are included in backups?"
    """
    return await client.list_repos(page, limit)