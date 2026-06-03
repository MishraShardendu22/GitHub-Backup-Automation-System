"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BackupRun, MetricsData } from "@/lib/types";
import { cn, formatBytes, formatDuration } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function MetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`${API}/api/metrics?days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [days]);

  const latestAnalytics = data?.latest_analytics ?? null;

  const chartData =
    data?.runs.map((r: BackupRun) => ({
      date: new Date(r.started_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      successful: r.successful,
      failed: r.failed,
      duration: Math.round(r.duration_ms / 1000),
      total: r.total_repos,
    })) ?? [];

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
        <div className="segmented">
          {[7, 14, 30, 90].map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => setDays(d)}
              className={cn("segmented-btn", days === d && "segmented-btn--active")}
              aria-pressed={days === d}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-6">
        <div className="stat-card">
          <div className="stat-label">Total Runs</div>
          <div className="stat-value">{data?.total_runs ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Duration</div>
          <div className="stat-value">
            {data?.avg_duration_ms ? formatDuration(data.avg_duration_ms) : "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Successful</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>
            {data?.total_successful ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Size</div>
          <div className="stat-value">
            {formatBytes(data?.total_size_bytes ?? 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Logs Stored</div>
          <div className="stat-value">{data?.total_logs ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Largest Repository</div>
          <div
            className="stat-value"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data?.largest_repository ?? "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6">
        <div className="stat-card">
          <div className="stat-label">Commits</div>
          <div className="stat-value">
            {latestAnalytics?.total_commits ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Branches</div>
          <div className="stat-value">{latestAnalytics?.branch_count ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed</div>
          <div className="stat-value" style={{ color: "var(--danger)" }}>
            {data?.total_failed ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tracked files</div>
          <div className="stat-value">
            {latestAnalytics?.tracked_files ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg blob size</div>
          <div className="stat-value">
            {latestAnalytics
              ? formatBytes(latestAnalytics.avg_blob_size_bytes)
              : "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Archive count</div>
          <div className="stat-value">
            {latestAnalytics?.archive_count ?? 0}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2">
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
            Success vs failure
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd5" />
              <XAxis dataKey="date" stroke="#9b9590" fontSize={11} />
              <YAxis stroke="#9b9590" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e2ddd5",
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              />
              <Bar dataKey="successful" fill="#27ae60" radius={[3, 3, 0, 0]} />
              <Bar dataKey="failed" fill="#c0392b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
            Duration trend (seconds)
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd5" />
              <XAxis dataKey="date" stroke="#9b9590" fontSize={11} />
              <YAxis stroke="#9b9590" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e2ddd5",
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              />
              <Area
                type="monotone"
                dataKey="duration"
                stroke="#1a1a1a"
                fill="rgba(26, 26, 26, 0.05)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card section-card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
          Current repository snapshot
        </div>
        {latestAnalytics ? (
          <div className="grid grid-cols-6">
            <div className="card-flat">
              <div className="stat-label">Commits</div>
              <div className="stat-value stat-value--md">{latestAnalytics.total_commits}</div>
            </div>
            <div className="card-flat">
              <div className="stat-label">Branches</div>
              <div className="stat-value stat-value--md">{latestAnalytics.branch_count}</div>
            </div>
            <div className="card-flat">
              <div className="stat-label">Tags</div>
              <div className="stat-value stat-value--md">{latestAnalytics.tag_count}</div>
            </div>
            <div className="card-flat">
              <div className="stat-label">Tracked files</div>
              <div className="stat-value stat-value--md">{latestAnalytics.tracked_files}</div>
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
                {latestAnalytics.largest_blob_path || "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted">No analytics snapshot stored yet.</div>
        )}
      </div>
    </div>
  );
}
