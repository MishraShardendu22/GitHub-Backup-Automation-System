"use client";

import { useEffect, useRef, useState } from "react";
import type { WsMessage } from "@/lib/types";

function buildLiveSocketUrl() {
  const configuredBase = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const baseUrl = new URL(configuredBase);
  const secureProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  return `${secureProtocol}//${baseUrl.host}/ws/live`;
}

export default function LivePage() {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<WsMessage[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(buildLiveSocketUrl());
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          if (msg.type === "log") {
            setLogs((prev) => [...prev.slice(-500), msg]);
          }
        } catch { /* ignore */ }
      };
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const levelColor = (level?: string) => {
    switch (level) {
      case "error": return "var(--danger)";
      case "warn": return "var(--warning)";
      case "info": return "#1565c0";
      default: return "var(--text-muted)";
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">Real-time</div>
          <h1 className="page-title">Live logs</h1>
          <p className="page-subtitle">
            A clean stream of worker events from PostgreSQL-backed execution logs.
          </p>
        </div>
        <div className="pill status-pill">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: connected ? "var(--success)" : "var(--danger)",
            }}
          />
          {connected ? "Connected" : "Disconnected"}
        </div>
      </div>

      <div className="card log-card">
        <div className="log-header">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Log stream</span>
          <span className="text-xs text-muted">{logs.length} entries</span>
        </div>
        <div className="log-body">
          {logs.length === 0 ? (
            <div className="text-sm text-muted" style={{ textAlign: "center", paddingTop: 120 }}>
              {connected ? "Waiting for log messages..." : "Connecting to WebSocket..."}
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={`${log.id}-${i}`} className="log-row">
                <span className="text-xs text-muted">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ""}
                </span>
                <span style={{ color: levelColor(log.level), fontWeight: 700, fontSize: 11 }}>
                  {log.level?.toUpperCase()}
                </span>
                <span className="text-xs truncate" style={{ color: "#6b4c9a" }}>
                  {log.repository ? `[${log.repository}]` : "[system]"}
                </span>
                <span style={{ fontSize: 12, color: "var(--text)" }}>{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
