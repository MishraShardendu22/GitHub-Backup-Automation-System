from typing import Annotated, Any
from data import client
from langchain_core.tools import tool

@tool
async def list_logs(
    page: Annotated[int, "Page number"] = 1,
    limit: Annotated[int, "Results per page"] = 100,
    level: Annotated[str | None, "INFO WARN ERROR"] = None,
    run_id: Annotated[int | None, "Backup run id"] = None,
) -> dict[str, Any]:
    """List execution logs with optional filtering by severity or backup run.

    Use when investigating failures, errors, warnings, or operational history.
    Examples:
    - "Show error logs for the last backup run."
    - "List recent warning and error entries."
    - "Get logs for backup run 15."
    - "Retrieve execution logs filtered by ERROR level."
    - "Inspect logs for the most recent failure."
    """
    return await client.list_logs(
        page=page,
        limit=limit,
        level=level,
        run_id=run_id,
    )