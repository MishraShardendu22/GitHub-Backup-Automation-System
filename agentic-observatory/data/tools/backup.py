from data import client
from typing import Annotated, Any
from langchain_core.tools import tool

@tool
async def fetch_dashboard_statistics() -> dict[str, Any]:
    """Fetch aggregated dashboard statistics for the backup system.

    Use when asking for high-level summary metrics or current dashboard overview.
    Examples:
    - "Show dashboard statistics for backup success and failures."
    - "What is the current backup dashboard summary?"
    - "Get overall backup system health metrics."
    - "Retrieve aggregated dashboard stats."
    - "Summarize the backup dashboard values."
    """
    return await client.get_dashboard_stats()


@tool
async def list_backup_runs(
    page: Annotated[int, "Page number"] = 1,
    limit: Annotated[int, "Results per page"] = 50,
) -> dict[str, Any]:
    """List backup runs with pagination.

    Use when requesting backup run history, recent runs, or a list of backups.
    Examples:
    - "List recent backup runs."
    - "Show backup history for the last 50 runs."
    - "Retrieve paginated backup runs."
    - "What backups have completed recently?"
    - "Display backup run history."
    """
    return await client.list_backups(page, limit)


@tool
async def fetch_latest_backup_run() -> dict[str, Any]:
    """Fetch the most recent backup run details.

    Use when asking for the latest backup execution, status, or results.
    Examples:
    - "Get the latest backup run."
    - "What was the most recent backup status?"
    - "Fetch details for the newest backup."
    - "Show the current latest backup result."
    - "Retrieve the latest backup execution details."
    """
    return await client.get_latest_backup()


@tool
async def fetch_backup_run_details(
    backup_id: Annotated[int, "Backup run identifier"],
) -> dict[str, Any]:
    """Fetch detailed information for a specific backup run.

    Use when asking about the status, duration, or outcome of one backup run.
    Examples:
    - "Get backup details for run 12."
    - "Show the outcome of backup run 202."
    - "Retrieve execution details for this backup ID."
    - "What happened during backup run 9?"
    - "Fetch the specific backup run diagnostics."
    """
    return await client.get_backup_details(backup_id)