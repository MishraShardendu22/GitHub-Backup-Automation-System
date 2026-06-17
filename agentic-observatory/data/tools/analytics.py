from data import client
from typing import Annotated, Any
from langchain_core.tools import tool


@tool
async def metrics(
    days: Annotated[int, "Days to analyze"] = 30,
    page: Annotated[int, "Page number"] = 1,
    limit: Annotated[int, "Results per page"] = 50,
) -> dict[str, Any]:
    """Fetch backup metrics for trend and performance analysis.

    Use when asking for backup performance, telemetry trends, or system health metrics.
    Examples:
    - "Show backup success rate trends for the last 30 days."
    - "Compare backup throughput over time."
    - "What are the key backup performance metrics?"
    - "Give me metrics for the past week."
    - "Analyze telemetry for backup size and duration."
    - "Summarize the latest backup system metrics."
    """
    return await client.get_metrics(days, page, limit)


@tool
async def analytics_history(
    page: Annotated[int, "Page number"] = 1,
    limit: Annotated[int, "Results per page"] = 50,
) -> dict[str, Any]:
    """Retrieve historical analytics snapshots.

    Use when requesting past analytics history, comparisons, or trend analysis.
    Examples:
    - "List analytics history for backup performance."
    - "Show analytics snapshots over the last month."
    - "Compare analytics results across runs."
    - "Retrieve historical analytics for trend review."
    - "What does analytics history say about backup load?"
    """
    return await client.list_analytics_history(page, limit)


@tool
async def latest_analytics() -> dict[str, Any]:
    """Fetch the most recent analytics snapshot.

    Use when asking for the latest available analytics data.
    Examples:
    - "Get the latest analytics snapshot."
    - "What are the current analytics metrics?"
    - "Show the newest analytics summary."
    - "Give me the most recent performance analytics."
    - "Fetch the latest analytics for the backup system."
    """
    return await client.get_latest_analytics()


@tool
async def analytics_for_run(
    run_id: Annotated[int, "Backup run identifier"],
) -> dict[str, Any]:
    """Retrieve analytics for a specific backup run.

    Use when asking about metrics or analytics tied to one run ID.
    Examples:
    - "Show analytics for backup run 42."
    - "Get performance details for run id 100."
    - "Retrieve analytics for that specific backup execution."
    - "What analytics were collected for this run?"
    - "Fetch run-level analytics for run_id 7."
    """
    return await client.get_analytics_for_run(run_id)