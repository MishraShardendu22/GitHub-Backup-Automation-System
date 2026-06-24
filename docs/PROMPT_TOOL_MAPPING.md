# Premade Prompts → Tool Mapping

## Overview
Each premade prompt is designed to trigger specific backend tools. The AI agent will automatically select the appropriate tools based on the query.

---

## Prompt 1: Dashboard Statistics
**Prompt**: 
> "Fetch the current dashboard statistics and summarize the backup health."

**Primary Tools Used**:
- ✅ `fetch_dashboard_statistics` - Gets overall dashboard stats
- ✅ `fetch_latest_backup_run` - Gets most recent backup status
- ✅ `list_execution_logs` - Checks for recent errors (if needed)

**Expected Response**:
- Total runs, success rate, failed/skipped counts
- Average duration, total size
- Latest backup status
- Overall health assessment

---

## Prompt 2: Backup Metrics & Trends
**Prompt**: 
> "Show me detailed metrics and trends for backups over the last 30 days."

**Primary Tools Used**:
- ✅ `fetch_backup_metrics` - Gets 30-day metrics and trends
- ✅ `list_historical_analytics` - Historical analytics snapshots
- ✅ `fetch_latest_analytics_snapshot` - Current analytics comparison

**Expected Response**:
- Success rate trends
- Performance metrics over time
- Duration patterns
- Size growth trends
- Backup run history with dates

---

## Prompt 3: Recent Backup Runs
**Prompt**: 
> "List the most recent backup runs and highlight any failures."

**Primary Tools Used**:
- ✅ `list_backup_runs` - Paginated backup history
- ✅ `fetch_backup_run_details` - Details for failed runs (if any)
- ✅ `list_execution_logs` - Error logs for failures (if level=ERROR, run_id=X)

**Expected Response**:
- Recent backup runs with status
- Failed runs highlighted with error details
- Timestamps and duration
- Repos affected in failures

---

## Prompt 4: Tracked Repositories
**Prompt**: 
> "Get all tracked repositories and show which ones are largest."

**Primary Tools Used**:
- ✅ `list_tracked_repositories` - All tracked repos with pagination
- ✅ `fetch_latest_analytics_snapshot` - Archive sizes and largest repos
- ✅ `fetch_dashboard_statistics` - Distinct repo count and largest archive

**Expected Response**:
- List of all tracked repositories
- Archive sizes
- Largest repository highlighted
- Total count and storage used

---

## Prompt 5: Error Logs
**Prompt**: 
> "Show me error logs from the latest backup execution."

**Primary Tools Used**:
- ✅ `fetch_latest_backup_run` - Get latest run ID
- ✅ `list_execution_logs` - Get logs filtered by level=ERROR and run_id
- ✅ `fetch_backup_run_details` - Get run details if errors found

**Expected Response**:
- Error messages from latest run
- Repository names where errors occurred
- Timestamps
- Error severity and context

---

## Tool Coverage Summary

| Tool | Prompt 1 | Prompt 2 | Prompt 3 | Prompt 4 | Prompt 5 | Covered |
|------|----------|----------|----------|----------|----------|---------|
| `fetch_dashboard_statistics` | ✅ | | | ✅ | | ✅ |
| `fetch_backup_metrics` | | ✅ | | | | ✅ |
| `list_backup_runs` | | | ✅ | | | ✅ |
| `fetch_latest_backup_run` | ✅ | | | | ✅ | ✅ |
| `fetch_backup_run_details` | | | ✅ | | ✅ | ✅ |
| `fetch_latest_analytics_snapshot` | | ✅ | | ✅ | | ✅ |
| `list_historical_analytics` | | ✅ | | | | ✅ |
| `fetch_analytics_for_run` | - | - | - | - | - | 🔶 |
| `list_tracked_repositories` | | | | ✅ | | ✅ |
| `list_execution_logs` | ✅ | | ✅ | | ✅ | ✅ |
| `send_report_email` | - | - | - | - | - | 🔶 |

**Coverage**: 9/11 tools directly covered (82%)

**Not Directly Covered**:
- `fetch_analytics_for_run` - Covered indirectly when user asks about specific run IDs
- `send_report_email` - Triggered by "Generate & Email Report" button in header

---

## Additional Natural Queries

Users can also ask follow-up questions that trigger other tools:

### Triggers `fetch_analytics_for_run`:
- "Show me analytics for backup run 42"
- "What were the metrics for run ID 15?"
- "Get performance data for the backup that ran yesterday"

### Triggers `send_report_email`:
- "Email me a backup health report"
- "Send the current status to my email"
- "Generate and email a full backup analysis"

---

## Design Philosophy

Each prompt is crafted to:
1. **Be specific** - Clear intent for the AI to select correct tools
2. **Be actionable** - Results in concrete, useful information
3. **Cover different use cases**:
   - Health check (Prompt 1)
   - Trend analysis (Prompt 2)
   - Failure investigation (Prompt 3)
   - Repository management (Prompt 4)
   - Error debugging (Prompt 5)

---

## Testing Each Prompt

After deployment, test each prompt to verify:
1. Agent selects correct tools
2. Tools execute successfully
3. Response is coherent and useful
4. No tool errors in response

**Test Command**: Click each premade prompt button in the AI dashboard after logging in.
