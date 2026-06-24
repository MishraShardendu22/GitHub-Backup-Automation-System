# Agentic Observatory - Tool Calls Documentation

## Overview

The Agentic Observatory AI agent has **11 tools** available to interact with the GitHub Backup system. All tools are registered in `agent/openrouter.py` and use the LangChain framework.

---

## ✅ Available Tools

### 1. **fetch_dashboard_statistics**
- **Location**: `data/tools/backup.py`
- **Backend Endpoint**: `GET /api/dashboard/stats`
- **Purpose**: Fetch aggregated dashboard statistics for the backup system
- **Parameters**: None
- **Example Queries**:
  - "Show dashboard statistics for backup success and failures."
  - "What is the current backup dashboard summary?"
  - "Get overall backup system health metrics."

### 2. **list_backup_runs**
- **Location**: `data/tools/backup.py`
- **Backend Endpoint**: `GET /api/backups?page=X&limit=Y`
- **Purpose**: List backup runs with pagination
- **Parameters**:
  - `page` (int, default: 1) - Page number
  - `limit` (int, default: 50) - Results per page
- **Example Queries**:
  - "List recent backup runs."
  - "Show backup history for the last 50 runs."

### 3. **fetch_latest_backup_run**
- **Location**: `data/tools/backup.py`
- **Backend Endpoint**: `GET /api/backups/latest`
- **Purpose**: Fetch the most recent backup run details
- **Parameters**: None
- **Example Queries**:
  - "Get the latest backup run."
  - "What was the most recent backup status?"

### 4. **fetch_backup_run_details**
- **Location**: `data/tools/backup.py`
- **Backend Endpoint**: `GET /api/backups/{backup_id}`
- **Purpose**: Fetch detailed information for a specific backup run
- **Parameters**:
  - `backup_id` (int) - Backup run identifier
- **Example Queries**:
  - "Get backup details for run 12."
  - "Show the outcome of backup run 202."

### 5. **fetch_backup_metrics**
- **Location**: `data/tools/analytics.py`
- **Backend Endpoint**: `GET /api/metrics?days=X&page=Y&limit=Z`
- **Purpose**: Fetch backup metrics for trend and performance analysis
- **Parameters**:
  - `days` (int, default: 30) - Days to analyze
  - `page` (int, default: 1) - Page number
  - `limit` (int, default: 50) - Results per page
- **Example Queries**:
  - "Show backup success rate trends for the last 30 days."
  - "Compare backup throughput over time."

### 6. **list_historical_analytics**
- **Location**: `data/tools/analytics.py`
- **Backend Endpoint**: `GET /api/analytics?page=X&limit=Y`
- **Purpose**: Retrieve historical analytics snapshots
- **Parameters**:
  - `page` (int, default: 1) - Page number
  - `limit` (int, default: 50) - Results per page
- **Example Queries**:
  - "List analytics history for backup performance."
  - "Show analytics snapshots over the last month."

### 7. **fetch_latest_analytics_snapshot**
- **Location**: `data/tools/analytics.py`
- **Backend Endpoint**: `GET /api/analytics/latest`
- **Purpose**: Fetch the most recent analytics snapshot
- **Parameters**: None
- **Example Queries**:
  - "Get the latest analytics snapshot."
  - "What are the current analytics metrics?"

### 8. **fetch_analytics_for_run**
- **Location**: `data/tools/analytics.py`
- **Backend Endpoint**: `GET /api/analytics/run/{run_id}`
- **Purpose**: Retrieve analytics for a specific backup run
- **Parameters**:
  - `run_id` (int) - Backup run identifier
- **Example Queries**:
  - "Show analytics for backup run 42."
  - "Get performance details for run id 100."

### 9. **list_tracked_repositories**
- **Location**: `data/tools/repository.py`
- **Backend Endpoint**: `GET /api/repos?page=X&limit=Y`
- **Purpose**: List tracked GitHub repositories in the backup system
- **Parameters**:
  - `page` (int, default: 1) - Page number
  - `limit` (int, default: 50) - Results per page
- **Example Queries**:
  - "List all tracked repositories."
  - "Show repository activity for the backup system."

### 10. **list_execution_logs**
- **Location**: `data/tools/log.py`
- **Backend Endpoint**: `GET /api/logs?page=X&limit=Y&level=Z&run_id=W`
- **Purpose**: List execution logs with optional filtering by severity or backup run
- **Parameters**:
  - `page` (int, default: 1) - Page number
  - `limit` (int, default: 100) - Results per page
  - `level` (str | None) - Filter by log level (INFO, WARN, ERROR)
  - `run_id` (int | None) - Filter by backup run ID
- **Example Queries**:
  - "Show error logs for the last backup run."
  - "List recent warning and error entries."
  - "Get logs for backup run 15."

### 11. **send_report_email** 🔐
- **Location**: `data/tools/email.py`
- **Backend**: Uses SMTP (not Go backend)
- **Purpose**: Send a generated report email to specified recipients
- **Parameters**:
  - `subject` (str) - The subject line of the email
  - `content_markdown` (str) - The full content of the report in markdown format
  - `recipients` (list[str] | None) - Optional list of recipient email addresses (defaults to `SMTP_TO` from settings)
- **Special Feature**: **Human-in-the-loop confirmation** - User must approve before email is sent
- **Example Queries**:
  - "Email me the latest backup health report."
  - "Send the backup failure analysis to shardendumishra01@gmail.com."

---

## 🔧 Tool Registration

All tools are registered in `agent/openrouter.py`:

```python
TOOLS = [
    list_backup_runs,
    list_execution_logs,
    fetch_backup_metrics,
    fetch_latest_backup_run,
    fetch_analytics_for_run,
    fetch_backup_run_details,
    list_historical_analytics,
    list_tracked_repositories,
    fetch_dashboard_statistics,
    fetch_latest_analytics_snapshot,
    send_report_email,
]
```

---

## 🔍 How to Verify Tools Are Working

### Prerequisites:
1. **Go Backend** must be running at the URL specified in `GO_BACKEND_URL` (agentic-observatory/.env)
2. **SMTP settings** must be configured for email tool (optional)

### Testing Steps:

1. **Check Backend Connectivity**:
   ```bash
   # From agentic-observatory directory
   curl $GO_BACKEND_URL/api/dashboard/stats
   ```

2. **Test Individual Endpoints**:
   ```bash
   # Dashboard stats
   curl http://localhost:8080/api/dashboard/stats
   
   # Latest backup
   curl http://localhost:8080/api/backups/latest
   
   # Backup runs (paginated)
   curl http://localhost:8080/api/backups?page=1&limit=10
   
   # Metrics
   curl http://localhost:8080/api/metrics?days=30
   
   # Logs
   curl http://localhost:8080/api/logs?level=ERROR
   
   # Repositories
   curl http://localhost:8080/api/repos
   
   # Analytics
   curl http://localhost:8080/api/analytics/latest
   ```

3. **Test via AI Agent**:
   - Start the agentic observatory: `python main.py` or `uvicorn main:app --reload`
   - Use the frontend at `/ai` route
   - Try queries like:
     - "Show me the latest backup run results."
     - "Fetch the current dashboard statistics and summarize them."
     - "Are there any critical errors in the execution logs?"

---

## ⚠️ Potential Issues

### 1. **Backend Not Running**
- **Symptom**: All tools fail with connection errors
- **Fix**: Start the Go backend with `go run main.go` in the `backend/` directory

### 2. **Database Empty**
- **Symptom**: Tools return empty results
- **Fix**: Run the worker CLI at least once to populate the database: `go run main.go` in root directory

### 3. **SMTP Not Configured**
- **Symptom**: `send_report_email` fails with SMTP errors
- **Fix**: Configure SMTP settings in `agentic-observatory/.env`:
  ```
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USERNAME=your-email@gmail.com
  SMTP_PASSWORD=your-app-password
  SMTP_FROM=your-email@gmail.com
  SMTP_TO=recipient@example.com
  ```

### 4. **Authentication Issues**
- **Symptom**: 401/403 errors from frontend
- **Fix**: Ensure JWT authentication is configured in agentic observatory `.env`:
  ```
  JWT_SECRET=your-secret-key
  CHAT_PASSWORD=your-password
  CHAT_USERNAME=admin
  ```

---

## 📊 Tool Usage Statistics

The AI Dashboard (`/ai` route in frontend) shows real-time statistics for tool usage including:
- Tool invocation count
- Average latency per tool
- Success rate per tool

This data is stored in the agentic observatory's SQLite database and can be queried via the stats endpoint.

---

## 🔐 Security Features

- **Human-in-the-loop**: The `send_report_email` tool requires explicit user confirmation before execution
- **JWT Authentication**: All API endpoints require valid authentication tokens
- **Input Validation**: All tool parameters are validated using Pydantic/LangChain annotations

---

## 📝 Notes

- All tools use `async`/`await` for non-blocking execution
- Tools are LangChain-compatible and use the `@tool` decorator
- The LLM can chain multiple tool calls in a single reasoning loop (max 5 iterations)
- Tool results are automatically serialized and fed back to the LLM for analysis
