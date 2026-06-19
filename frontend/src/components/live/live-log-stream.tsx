"use client";

import { useEffect, useRef, useState } from "react";
import type { WsMessage } from "@/types";

function buildLiveSocketUrl() {
  const configuredBase =
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080";
  const baseUrl = new URL(configuredBase);
  const secureProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${secureProtocol}//${baseUrl.host}/ws/live`;
}

function levelColor(level?: string) {
  switch (level) {
    case "error":
      return "var(--danger)";
    case "warn":
      return "var(--warning)";
    case "info":
      return "var(--accent)";
    default:
      return "var(--text-muted)";
  }
}

export function LiveLogStream() {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<WsMessage[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(buildLiveSocketUrl());
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          if (msg.type === "log") setLogs((prev) => [...prev.slice(-500), msg]);
        } catch {
          /* ignore */
        }
      };
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-kicker">Live Monitor</div>
          <h1 className="page-title">Real-time execution logs</h1>
          <p className="page-subtitle">
            A live stream of worker events from PostgreSQL-backed execution
            logs.
          </p>
        </div>
        <div
          className="pill status-pill"
          style={{
            alignSelf: "flex-start",
            cursor: "default",
          }}
        >
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
          <span style={{ fontWeight: 600, fontSize: 16 }}>Log stream</span>
          <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{logs.length} entries</span>
        </div>
        <div className="log-body">
          {logs.length === 0 ? (
            <div
              style={{ fontSize: 15, color: "var(--text-muted)", textAlign: "center", paddingTop: 120 }}
            >
              {connected
                ? "Waiting for log messages..."
                : "Connecting to WebSocket..."}
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={`${log.id}-${i}`} className="log-row">
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {log.timestamp
                    ? new Date(log.timestamp).toLocaleTimeString()
                    : ""}
                </span>
                <span
                  style={{
                    color: levelColor(log.level),
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {log.level?.toUpperCase()}
                </span>
                <span className="truncate" style={{ fontSize: 13, color: "var(--accent)", opacity: 0.8 }}>
                  {log.repository ? `[${log.repository}]` : "[system]"}
                </span>
                <span style={{ fontSize: 14, color: "var(--text)" }}>
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </>
  );
}
