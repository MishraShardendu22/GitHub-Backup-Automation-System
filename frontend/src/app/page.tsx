import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { safeFetch } from "@/lib/api";
import { formatBytes, formatDate, formatDuration } from "@/lib/utils";
import type { BackupRun } from "@/types";

export const metadata = {
  title: "Dashboard Overview",
  description: "Overview dashboard of GitHub backup runs, repository statistics, archive sizes, and worker execution logs.",
  alternates: {
    canonical: "/",
  },
};

interface DashboardStats {
  total_runs: number;
  total_repos: number;
  total_successful: number;
  success_rate: number;
  last_run_status: string;
  last_run_at: string | null;
  total_failed: number;
  avg_duration_ms: number;
  total_skipped: number;
  distinct_repos: number;
  total_logs: number;
  total_size_bytes: number;
  largest_archive_bytes: number;
  largest_repository: string;
  latest_analytics: unknown;
}

async function fetchStats(): Promise<DashboardStats | null> {
  return safeFetch<DashboardStats>("/api/dashboard/stats");
}

async function fetchLatestRun(): Promise<BackupRun | null> {
  const data = await safeFetch<{ run: BackupRun | null }>(
    "/api/backups/latest",
  );
  return data?.run || null;
}

export default async function DashboardPage() {
  const [stats, latestRun] = await Promise.all([
    fetchStats(),
    fetchLatestRun(),
  ]);

  return (
    <div className="page">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="hero-grid">
        <div className="card hero-card">
          <div className="hero-glow" />
          <div className="hero-content">
            <div className="page-kicker">Backup operations</div>
            <h1 className="hero-title">Backup Observatory</h1>
            <p className="hero-subtitle">
              Monitor your GitHub repository backups — run health, storage
              usage, and live worker status at a glance.
            </p>
            <div className="hero-tags">
              <span className="pill">PostgreSQL</span>
              <span className="pill">Execution logs</span>
              <span className="pill">Repo archive sizes</span>
              <span className="pill">Git snapshots</span>
            </div>
          </div>
        </div>

        <div className="hero-stack">
          <div className="stat-card stat-card--compact">
            <div className="stat-label">Latest run</div>
            <div style={{ marginTop: 4 }}>
              {latestRun ? (
                <StatusBadge status={latestRun.status} />
              ) : (
                <span className="text-muted" style={{ fontSize: 12 }}>
                  No run yet
                </span>
              )}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              {latestRun
                ? formatDate(latestRun.started_at)
                : "Start the backup worker"}
            </div>
          </div>

          <div className="stat-card stat-card--compact">
            <div className="stat-label">Success rate</div>
            <div className="stat-value stat-value--md">
              {stats?.success_rate && stats.success_rate > 0
                ? `${stats.success_rate.toFixed(0)}%`
                : "—"}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              {stats?.total_runs ?? 0} total runs
            </div>
          </div>

          <div className="stat-card stat-card--compact">
            <div className="stat-label">Total backup size</div>
            <div className="stat-value stat-value--md">
              {formatBytes(stats?.total_size_bytes ?? 0)}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              {stats?.distinct_repos ?? 0} distinct repos
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 KPI tiles ──────────────────────────────────────────────── */}
      <div className="metric-grid metric-grid--four stats-grid">
        <div className="stat-card">
          <div className="stat-label">Avg duration</div>
          <div className="stat-value">
            {stats?.avg_duration_ms
              ? formatDuration(stats.avg_duration_ms)
              : "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Successful repos</div>
          <div className="stat-value stat-value--success">
            {stats?.total_successful ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed repos</div>
          <div className="stat-value stat-value--danger">
            {stats?.total_failed ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Logs stored</div>
          <div className="stat-value">{stats?.total_logs ?? 0}</div>
        </div>
      </div>

      {/* ── Latest run quick-card ─────────────────────────────────────── */}
      {latestRun && (
        <section className="card section-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                className="section-title"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                Latest backup run — #{latestRun.id}
              </div>
              <div
                className="section-desc"
                style={{
                  fontSize: 11.5,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Started {formatDate(latestRun.started_at)} ·{" "}
                {formatDuration(latestRun.duration_ms)}
              </div>
            </div>
            <Link
              href={`/backups/${latestRun.id}`}
              className="btn btn-outline"
              style={{ fontSize: 11 }}
            >
              View full results →
            </Link>
          </div>

          <div
            className="metric-grid metric-grid--four"
            style={{ marginTop: 12 }}
          >
            <div className="card-flat">
              <div className="stat-label">Repos backed up</div>
              <div className="stat-value stat-value--md">
                {latestRun.total_repos}
              </div>
            </div>
            <div className="card-flat">
              <div className="stat-label">Successful</div>
              <div className="stat-value stat-value--md stat-value--success">
                {latestRun.successful}
              </div>
            </div>
            <div className="card-flat">
              <div className="stat-label">Failed</div>
              <div
                className="stat-value stat-value--md"
                style={{
                  color: latestRun.failed > 0 ? "var(--danger)" : "inherit",
                }}
              >
                {latestRun.failed}
              </div>
            </div>
            <div className="card-flat">
              <div className="stat-label">Skipped</div>
              <div className="stat-value stat-value--md text-muted">
                {latestRun.skipped}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Navigation cards ──────────────────────────────────────────── */}
      <div className="metric-grid metric-grid--four">
        <NavCard
          href="/backups"
          title="Backup History"
          desc="All past runs and per-repo results"
          icon={<path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />}
        />
        <NavCard
          href="/analytics"
          title="Analytics"
          desc="Charts and trend overview"
          icon={
            <>
              <path d="M3 3v18h18" />
              <path d="M7 16l4-4 4 4 4-6" />
            </>
          }
        />
        <NavCard
          href="/analytics/runs"
          title="Run History"
          desc="Full paginated run table"
          icon={
            <>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </>
          }
        />
        <NavCard
          href="/analytics/snapshots"
          title="Git Snapshots"
          desc="Repository analytics history"
          icon={
            <>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </>
          }
        />
      </div>
    </div>
  );
}

function NavCard({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        className="card"
        style={{
          padding: "14px 16px",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          height: "100%",
          transition: "border-color 0.15s",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "rgba(212,168,50,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {icon}
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
            {title}
          </div>
          <div
            style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}
          >
            {desc}
          </div>
        </div>
      </div>
    </Link>
  );
}
