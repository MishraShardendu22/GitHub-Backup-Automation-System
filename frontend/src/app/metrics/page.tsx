import Link from "next/link";
import MetricsCharts, {
  type MetricsChartPoint,
} from "@/components/metrics/metrics-charts";
import type { BackupRun, MetricsData } from "@/lib/types";
import { cn, formatBytes, formatDuration } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const DAY_OPTIONS = [7, 14, 30, 90] as const;

async function fetchMetrics(days: number): Promise<MetricsData | null> {
  try {
    const res = await fetch(`${API}/api/metrics?days=${days}`, {
      cache: "no-store",
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

function parseDays(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return DAY_OPTIONS.includes(parsed as (typeof DAY_OPTIONS)[number])
    ? parsed
    : 30;
}

function buildChartData(runs: BackupRun[]): MetricsChartPoint[] {
  return runs.map((run) => ({
    date: new Date(run.started_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    successful: run.successful,
    failed: run.failed,
    duration: Math.round(run.duration_ms / 1000),
    total: run.total_repos,
  }));
}

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string | string[] }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = parseDays(daysParam);
  const data = await fetchMetrics(days);
  const latestAnalytics = data?.latest_analytics ?? null;
  const chartData = buildChartData(data?.runs ?? []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">Analytics</div>
          <h1 className="page-title">Metrics</h1>
          <p className="page-subtitle">
            Stored run trends, size totals, and performance over time.
          </p>
        </div>
        <nav className="segmented" aria-label="Metrics range">
          {DAY_OPTIONS.map((option) => (
            <Link
              key={option}
              href={`/metrics?days=${option}`}
              className={cn(
                "segmented-btn",
                days === option && "segmented-btn--active",
              )}
              aria-current={days === option ? "page" : undefined}
            >
              {option}d
            </Link>
          ))}
        </nav>
      </div>

      <div className="metric-grid metric-grid--six stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total runs</div>
          <div className="stat-value">{data?.total_runs ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg duration</div>
          <div className="stat-value">
            {data?.avg_duration_ms ? formatDuration(data.avg_duration_ms) : "-"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Successful</div>
          <div className="stat-value stat-value--success">
            {data?.total_successful ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed</div>
          <div className="stat-value stat-value--danger">
            {data?.total_failed ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Logs stored</div>
          <div className="stat-value">{data?.total_logs ?? 0}</div>
        </div>
      </div>

      <MetricsCharts data={chartData} />

      <section className="card section-card">
        <div className="section-title">Current repository snapshot</div>
        <div className="section-desc">
          Latest collector output rendered on the server for the selected range.
        </div>
        {latestAnalytics ? (
          <div className="metric-grid metric-grid--six">
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
              <div className="stat-label">Largest blob</div>
              <div className="stat-value stat-value--md truncate">
                {latestAnalytics.largest_blob_path || "-"}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">No analytics snapshot stored yet.</div>
        )}
      </section>
    </div>
  );
}
