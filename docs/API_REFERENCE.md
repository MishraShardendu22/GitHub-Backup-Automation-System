# API Reference

This file describes the HTTP API exposed by the backend server (see [backend/routes/app.routes.go](../backend/routes/app.routes.go)). All API endpoints are mounted under `/api` unless otherwise stated.

## Backups
- `GET /api/backups` — List backup runs. Query params: `limit` (default 20), `offset` (default 0). Returns an array of `BackupRun` objects.
- `GET /api/backups/latest` — Returns the most-recent backup run.
- `GET /api/backups/:id` — Returns details and `backup_results` for a specific run ID.

## Dashboard / Metrics
- `GET /api/dashboard/stats` — Aggregated statistics for dashboard tiles: total runs, total repos, success rate, last run status, total size, largest archive, and latest analytics snapshot.
- `GET /api/metrics` — Time-series metrics and trends for backup performance. Query params: `days` (default 30). Returns aggregated stats and run history for the given time window.

## Analytics
- `GET /api/analytics/history` — Returns a list of all repository analytics snapshots (`RepoAnalyticsSnapshot`), ordered by the time they were captured.
- `GET /api/analytics/latest` — Returns the most recent analytics snapshot.
- `GET /api/analytics/:id` — Returns the analytics snapshot for a specific backup run ID.

## Logs
- `GET /api/logs` — Returns stored execution logs for display.

## Repos
- `GET /api/repos` — Returns the currently tracked repositories (from the dashboard perspective).

## WebSocket
- `GET /ws/live` — WebSocket endpoint for real-time log/worker events. Returns live worker status (progress, current repo, run id) and log streaming.

---

### Notes
- Responses are implemented in `backend/handlers/*`. See handler files for exact field names and structures.
- The API relies on PostgreSQL for persisted runs and analytics; ensure `POSTGRES_URL` is configured before starting the backend.
- Rate limiting is applied to all `/api` routes via `middleware.RateLimitDefault()`.
