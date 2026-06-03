import type { BackupRun, DashboardStats } from "@/lib/types";
import { formatBytes, formatDate, formatDuration } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function fetchStats(): Promise<DashboardStats | null> {
  try {
    const res = await fetch(`${API}/api/dashboard/stats`, {
      cache: "no-store",
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function fetchRecentRuns(): Promise<BackupRun[]> {
  try {
    const res = await fetch(`${API}/api/backups?limit=5`, {
      cache: "no-store",
    });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

async function fetchRepos(): Promise<
  Array<{ full_name: string; last_status: string; archive_size_bytes: number }>
> {
  try {
    const res = await fetch(`${API}/api/repos`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [stats, runs, repos] = await Promise.all([
    fetchStats(),
    fetchRecentRuns(),
    fetchRepos(),
  ]);

  const latestRun = runs.length > 0 ? runs[0] : null;
  const latestAnalytics = stats?.latest_analytics ?? null;
  const totalSize =
    (stats?.total_size_bytes && stats.total_size_bytes > 0
      ? stats.total_size_bytes
      : null) ??
    (latestAnalytics?.total_archive_size_bytes && latestAnalytics.total_archive_size_bytes > 0
      ? latestAnalytics.total_archive_size_bytes
      : null) ??
    repos.reduce((a, r) => a + (r.archive_size_bytes || 0), 0);
  const failureCount = stats?.total_failed ?? 0;
  const totalSkipped = stats?.total_skipped ?? 0;
  const totalLogs =
    (stats?.total_logs && stats.total_logs > 0 ? stats.total_logs : null) ?? 0;
  const distinctRepos =
    (stats?.distinct_repos && stats.distinct_repos > 0
      ? stats.distinct_repos
      : null) ??
    (latestAnalytics?.tracked_files && latestAnalytics.tracked_files > 0
      ? latestAnalytics.tracked_files
      : null) ??
    repos.length;

  const topRepos = [...repos]
    .sort((a, b) => b.archive_size_bytes - a.archive_size_bytes)
    .slice(0, 6);
  const maxSize = topRepos.length > 0 ? topRepos[0].archive_size_bytes : 1;

  const recentRuns = runs.slice(0, 4);
  const latestRepo = topRepos[0];

  return (
    <div className="page">
      <section className="hero-grid">
        <div className="card hero-card">
          <div className="hero-glow" />
          <div className="hero-content">
            <div className="page-kicker">Backup operations</div>
            <h1 className="hero-title">Backup Observatory</h1>
            <p className="hero-subtitle">
              A PostgreSQL-backed overview of backup activity, repository sizes,
              run outcomes, and live worker health.
            </p>
            <div className="hero-tags">
              <span className="pill">PostgreSQL</span>
              <span className="pill">Execution logs</span>
              <span className="pill">Repo archive sizes</span>
              <span className="pill">Run history</span>
            </div>
          </div>
        </div>

        <div className="hero-stack">
          <div className="stat-card stat-card--compact">
            <div className="stat-label">Latest run</div>
            <div className="stat-value stat-value--md">
              {latestRun ? latestRun.status : "No run yet"}
            </div>
            <div className="text-xs text-muted">
              {latestRun
                ? formatDate(latestRun.started_at)
                : "Waiting for the first backup"}
            </div>
          </div>
          <div className="stat-card stat-card--compact">
            <div className="stat-label">Largest repository</div>
            <div className="stat-value stat-value--md truncate">
              {latestRepo?.full_name ?? stats?.largest_repository ?? "—"}
            </div>
            <div className="text-xs text-muted">
              {formatBytes(
                stats?.largest_archive_bytes ??
                  latestRepo?.archive_size_bytes ??
                  0,
              )}
            </div>
          </div>
          <div className="stat-card stat-card--compact">
            <div className="stat-label">Largest blob</div>
            <div className="stat-value stat-value--md truncate">
              {latestAnalytics?.largest_blob_path ?? "—"}
            </div>
            <div className="text-xs text-muted">
              {latestAnalytics
                ? formatBytes(latestAnalytics.largest_blob_size_bytes)
                : "Waiting for analytics snapshot"}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-6">
        <div className="stat-card">
          <div className="stat-label">Total runs</div>
          <div className="stat-value">{stats?.total_runs ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Distinct repos</div>
          <div className="stat-value">{distinctRepos}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Success rate</div>
          <div className="stat-value">
            {stats?.success_rate && stats.success_rate > 0
              ? `${stats.success_rate.toFixed(0)}%`
              : "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total size</div>
          <div className="stat-value">{formatBytes(totalSize)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Logs stored</div>
          <div className="stat-value">{totalLogs}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failures</div>
          <div className="stat-value" style={{ color: "var(--danger)" }}>
            {failureCount}
          </div>
        </div>
      </div>


      <div className="card section-card">
        <div className="section-title">Git snapshot</div>
        <div className="section-desc">
          Backend-collected repository analytics refreshed from the live _Repos
          checkout.
        </div>
        {latestAnalytics ? (
          <div className="grid grid-cols-6">
            <div className="card-flat">
              <div className="stat-label">Commits</div>
              <div className="stat-value stat-value--md">
                {latestAnalytics.total_commits}
              </div>
            </div>
            <div className="card-flat">
              <div className="stat-label">Branches</div>
              <div className="stat-value stat-value--md">
                {latestAnalytics.branch_count}
              </div>
            </div>
            <div className="card-flat">
              <div className="stat-label">Tags</div>
              <div className="stat-value stat-value--md">
                {latestAnalytics.tag_count}
              </div>
            </div>
            <div className="card-flat">
              <div className="stat-label">Tracked files</div>
              <div className="stat-value stat-value--md">
                {latestAnalytics.tracked_files}
              </div>
            </div>
            <div className="card-flat">
              <div className="stat-label">Avg blob size</div>
              <div className="stat-value stat-value--md">
                {formatBytes(latestAnalytics.avg_blob_size_bytes)}
              </div>
            </div>
            <div className="card-flat">
              <div className="stat-label">Archive count</div>
              <div className="stat-value stat-value--md">
                {latestAnalytics.archive_count}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted" style={{ paddingTop: 12 }}>
            Analytics snapshot will appear once the backend collector runs.
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title">Recent runs</div>
        <div className="section-desc">
          The latest persisted backup_runs entries, with outcomes and durations.
        </div>
        {recentRuns.length === 0 ? (
          <div className="text-sm text-muted" style={{ padding: "16px 0" }}>
            No runs yet
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table table-wide">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Status</th>
                  <th>Repos</th>
                  <th>Success</th>
                  <th>Failed</th>
                  <th>Skipped</th>
                  <th>Duration</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id}>
                    <td>#{run.id}</td>
                    <td>
                      <span
                        className={`badge ${run.status === "completed" ? "badge-success" : run.status === "running" ? "badge-running" : "badge-error"}`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td>{run.total_repos}</td>
                    <td style={{ color: "var(--success)" }}>
                      {run.successful}
                    </td>
                    <td style={{ color: "var(--danger)" }}>{run.failed}</td>
                    <td>{run.skipped}</td>
                    <td>{formatDuration(run.duration_ms)}</td>
                    <td>{formatDate(run.started_at)}</td>
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
