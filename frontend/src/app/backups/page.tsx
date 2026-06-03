import { formatDuration, formatDate } from "@/lib/utils";
import type { BackupRun } from "@/lib/types";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function fetchRuns(): Promise<BackupRun[]> {
  try {
    const res = await fetch(`${API}/api/backups?limit=50`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

export default async function BackupsPage() {
  const runs = await fetchRuns();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">History</div>
          <h1 className="page-title">Backup runs</h1>
          <p className="page-subtitle">
            Complete history of all backup executions and their results.
          </p>
        </div>
      </div>

      <div className="card table-card">
        {runs.length === 0 ? (
          <p className="text-sm text-muted" style={{ padding: 48, textAlign: "center" }}>
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
                    <td style={{ fontWeight: 500 }}>#{run.id}</td>
                    <td>
                      <span
                        className={`badge ${run.status === "completed" ? "badge-success" : run.status === "running" ? "badge-running" : "badge-error"}`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="text-xs text-secondary">
                      {formatDate(run.started_at)}
                    </td>
                    <td>{formatDuration(run.duration_ms)}</td>
                    <td>{run.total_repos}</td>
                    <td style={{ color: "var(--success)" }}>{run.successful}</td>
                    <td style={{ color: run.failed > 0 ? "var(--danger)" : "inherit" }}>
                      {run.failed}
                    </td>
                    <td className="text-muted">{run.skipped}</td>
                    <td>
                      <Link href={`/backups/${run.id}`} className="btn btn-ghost" style={{ fontSize: 12 }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
