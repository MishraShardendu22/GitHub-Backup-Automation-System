
from clients.go_backend import GoBackendClient
from agent.investigation_types import InvestigationType

client = GoBackendClient()



async def investigate(classification: InvestigationType):
    print("TYPE:", type(classification))
    print("VALUE:", classification)
    match classification:
        case InvestigationType.BACKUP:
            return await client.get_latest_backup()

        case InvestigationType.FAILURE:
            return await client.list_logs(
                limit=50,
                level="ERROR",
            )

        case InvestigationType.REPOSITORY:
            return await client.list_repos(
                page=1,
                limit=50,
            )

        case InvestigationType.ANALYTICS:
            return await client.get_latest_analytics()

        case InvestigationType.METRICS:
            return await client.get_metrics(
                days=30,
                page=1,
                limit=50,
            )

        case InvestigationType.SUMMARY:
            return await client.get_dashboard_stats()

        case _:
            return {}