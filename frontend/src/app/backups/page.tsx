import Link from "next/link";
import { PaginationBar } from "@/components/analytics/pagination-bar";
import { serverFetch } from "@/lib/server-api";
import { formatDate, formatDuration } from "@/lib/utils";
import type { BackupRun } from "@/types";

interface BackupsResponse {
  data: BackupRun[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

async function fetchBackups(
  page: number,
  pageSize: number,
): Promise<BackupsResponse | null> {
  return serverFetch<BackupsResponse>(
    `/api/backups?page=${page}&page_size=${pageSize}`,
  );
}

export default async function BackupsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 25;

  const result = await fetchBackups(page, pageSize);
  const runs = result?.data || [];
  const pagination = result?.pagination;

  return (
    <div className="page">
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-kicker">Backup Run Logs</div>
          <h1 className="page-title">Execution History</h1>
          <p className="page-subtitle">
            Complete history of all backup executions and their detailed results.
          </p>
        </div>
      </div>

      <div className="card table-card">
        {!result ? (
          <p
            style={{
              color: "var(--danger)",
              padding: 40,
              textAlign: "center",
              fontSize: 15,
            }}
          >
            Failed to load backups.
          </p>
        ) : runs.length === 0 ? (
          <p
            className="text-sm text-muted"
            style={{ padding: 40, textAlign: "center" }}
          >
            No backup runs found. Run the worker to create backups.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Total</th>
                  <th>Success</th>
                  <th>Failed</th>
                  <th>Skipped</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td data-label="Run" style={{ fontWeight: 500 }}>
                      #{run.id}
                    </td>
                    <td data-label="Status">
                      <span
                        className={`badge ${run.status === "completed" ? "badge-success" : run.status === "running" ? "badge-running" : "badge-error"}`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td data-label="Date" style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                      {formatDate(run.started_at)}
                    </td>
                    <td data-label="Duration">
                      {formatDuration(run.duration_ms)}
                    </td>
                    <td data-label="Total">{run.total_repos}</td>
                    <td
                      data-label="Success"
                      style={{ color: "var(--success)" }}
                    >
                      {run.successful}
                    </td>
                    <td
                      data-label="Failed"
                      style={{
                        color: run.failed > 0 ? "var(--danger)" : "inherit",
                      }}
                    >
                      {run.failed}
                    </td>
                    <td data-label="Skipped" className="text-muted">
                      {run.skipped}
                    </td>
                    <td data-label="Details">
                      <Link
                        href={`/backups/${run.id}`}
                        className="btn btn-ghost"
                        style={{ fontSize: 13 }}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && (
              <div style={{ padding: "0 16px 16px" }}>
                <PaginationBar
                  page={pagination.page}
                  totalPages={pagination.total_pages}
                  pageSize={pagination.page_size}
                  totalItems={pagination.total_items}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
