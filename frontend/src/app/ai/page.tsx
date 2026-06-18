"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface MessageToolCall {
  name: string;
  args: any;
  success: boolean;
  running: boolean;
  duration_ms: number | null;
  result?: any;
  error?: string;
}

interface Message {
  id: string;
  role: Role;
  content: string;
  streaming?: boolean;
  timestamp: Date;
  toolCalls?: MessageToolCall[];
  iteration?: number;
}

interface AuthState {
  token: string | null;
  username: string | null;
}

interface Session {
  id: string;
  session_name: string;
  created_at: string;
  updated_at: string;
}

interface ToolStat {
  name: string;
  count: number;
  avg_duration: number;
  success_count: number;
  success_rate: number;
}

interface DashboardStats {
  total_conversations: number;
  total_agent_runs: number;
  success_rate: number;
  tool_usage: ToolStat[];
  memory_stats: {
    total_messages: number;
  };
  recent_activity: {
    request_id: string;
    question: string;
    status: string;
    created_at: string;
  }[];
  system_health: {
    database: string;
    status: string;
  };
  model_name?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function LoaderPanel({ message }: { message: string }) {
  return (
    <div className="ai-loader-panel">
      <div className="ai-loader-spinner" />
      <div className="ai-loader-text">{message}</div>
    </div>
  );
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoStr: string) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return isoStr;
  }
}

const PREMADE_PROMPTS = [
  "What is the overall health of my backups?",
  "Show me the most recent backup run results.",
  "Summarise storage usage across all repositories.",
  "Compare backup success rates over the last 30 days.",
  "Are there any critical errors in the execution logs?",
];

// ─── Icons (Inline SVGs) ──────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const DashboardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="3" width="7" height="9"></rect>
    <rect x="14" y="3" width="7" height="5"></rect>
    <rect x="14" y="12" width="7" height="9"></rect>
    <rect x="3" y="16" width="7" height="5"></rect>
  </svg>
);

const ChatIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const DatabaseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
  </svg>
);

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

// ─── Login Panel ─────────────────────────────────────────────────────────────

function LoginPanel({
  onLogin,
  loading,
  error,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) onLogin(username, password);
  };

  return (
    <div className="ai-login-panel">
      <div className="ai-login-icon" aria-hidden="true">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a5 5 0 0 1 5 5v2H7V7a5 5 0 0 1 5-5z" />
          <rect x="3" y="9" width="18" height="13" rx="2" />
          <circle cx="12" cy="15" r="1.5" />
        </svg>
      </div>
      <p className="ai-login-label">Sign in to access the AI Observatory Dashboard</p>
      <form onSubmit={handleSubmit} className="ai-login-form" noValidate>
        <input
          id="ai-username"
          type="text"
          className="ai-login-input"
          placeholder="Username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          aria-label="Username"
        />
        <input
          id="ai-password"
          type="password"
          className="ai-login-input"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-label="Password"
        />
        {error && (
          <p role="alert" className="ai-login-error">
            {error}
          </p>
        )}
        <button
          id="ai-login-submit"
          type="submit"
          className="sendBtn"
          disabled={loading || !username || !password}
          style={{ width: "100%", marginTop: 4 }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}

// ─── Tool Activity Visualizer ────────────────────────────────────────────────

function ToolActivityBlock({ tool }: { tool: MessageToolCall }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ai-tool-activity-card">
      <div className="ai-tool-activity-header" onClick={() => setExpanded(!expanded)}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            className={`ai-tool-status-icon ${
              tool.running ? "running" : tool.success ? "success" : "error"
            }`}
          />
          <strong style={{ fontFamily: "monospace", color: "var(--accent)" }}>
            {tool.name}
          </strong>
          <span style={{ marginLeft: 8, color: "var(--text-secondary)", fontSize: "11px" }}>
            {tool.running
              ? "Running…"
              : tool.success
              ? `Success (${tool.duration_ms ? tool.duration_ms.toFixed(0) : 0}ms)`
              : "Failed"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            {expanded ? "Hide" : "Details"}
          </span>
          <ChevronIcon />
        </div>
      </div>
      {expanded && (
        <div className="ai-tool-activity-details">
          <div>
            <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Arguments:</span>
            <pre className="ai-json-viewer">{JSON.stringify(tool.args, null, 2)}</pre>
          </div>
          {tool.result && (
            <div>
              <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Result:</span>
              <pre className="ai-json-viewer">{JSON.stringify(tool.result, null, 2)}</pre>
            </div>
          )}
          {tool.error && (
            <div>
              <span style={{ color: "#ef4444", fontWeight: 600 }}>Error:</span>
              <pre className="ai-json-viewer" style={{ color: "#f87171" }}>
                {tool.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Rich Message Content Renderer ──────────────────────────────────────────

function renderMarkdownInline(text: string): React.ReactNode {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={idx}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={idx}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={idx}
              style={{
                fontSize: "11px",
                background: "rgba(255, 255, 255, 0.08)",
                padding: "2px 4px",
                borderRadius: "3px",
                fontFamily: "monospace",
                textTransform: "none",
                color: "var(--accent)",
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}

function MessageContentRenderer({ content }: { content: string }) {
  const parseBlocks = (text: string) => {
    const blocks: { type: "text" | "code" | "table"; content: string; language?: string }[] = [];
    const lines = text.split("\n");
    let inCode = false;
    let codeLang = "";
    let codeLines: string[] = [];
    let inTable = false;
    let tableLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith("```")) {
        if (inCode) {
          blocks.push({ type: "code", content: codeLines.join("\n"), language: codeLang });
          codeLines = [];
          inCode = false;
        } else {
          inCode = true;
          codeLang = line.replace("```", "").trim();
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        inTable = true;
        tableLines.push(line);
        continue;
      } else if (inTable) {
        blocks.push({ type: "table", content: tableLines.join("\n") });
        tableLines = [];
        inTable = false;
      }

      blocks.push({ type: "text", content: line });
    }

    if (inCode && codeLines.length > 0) {
      blocks.push({ type: "code", content: codeLines.join("\n"), language: codeLang });
    }
    if (inTable && tableLines.length > 0) {
      blocks.push({ type: "table", content: tableLines.join("\n") });
    }

    const merged: typeof blocks = [];
    for (const b of blocks) {
      const last = merged[merged.length - 1];
      if (last && last.type === "text" && b.type === "text") {
        last.content += "\n" + b.content;
      } else {
        merged.push(b);
      }
    }

    return merged;
  };

  const blocks = parseBlocks(content);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {blocks.map((block, idx) => {
        if (block.type === "code") {
          return (
            <div key={idx}>
              <div className="ai-code-block-header">
                <span>{block.language || "code"}</span>
                <span>Copy</span>
              </div>
              <pre
                className="ai-code-block-body"
                style={{
                  fontFamily: "monospace",
                  background: "#0d0b0a",
                  padding: "12px",
                  borderRadius: "0 0 8px 8px",
                  overflowX: "auto",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderTop: "none",
                  fontSize: "12px",
                  margin: 0,
                }}
              >
                <code>{block.content}</code>
              </pre>
            </div>
          );
        }

        if (block.type === "table") {
          const rows = block.content.split("\n");
          const headerCells = rows[0]
            .split("|")
            .map((c) => c.trim())
            .filter((c, i, arr) => i > 0 && i < arr.length - 1);
          const dataRows = rows
            .slice(2)
            .map((row) =>
              row
                .split("|")
                .map((c) => c.trim())
                .filter((c, i, arr) => i > 0 && i < arr.length - 1)
            )
            .filter((row) => row.length > 0);

          return (
            <div className="ai-rich-table-container" key={idx}>
              <table className="ai-rich-table">
                <thead>
                  <tr>
                    {headerCells.map((cell, cidx) => (
                      <th key={cidx}>{renderMarkdownInline(cell)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, ridx) => (
                    <tr key={ridx}>
                      {row.map((cell, cidx) => (
                        <td key={cidx}>{renderMarkdownInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        const lines = block.content.split("\n");
        return (
          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {lines.map((line, lidx) => {
              const trimmed = line.trim();

              if (trimmed.startsWith("# ")) {
                return (
                  <h3 key={lidx} style={{ fontSize: "18px", color: "var(--accent)", margin: "10px 0 4px" }}>
                    {renderMarkdownInline(trimmed.slice(2))}
                  </h3>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h4 key={lidx} style={{ fontSize: "15px", color: "var(--text)", margin: "8px 0 4px" }}>
                    {renderMarkdownInline(trimmed.slice(3))}
                  </h4>
                );
              }
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <li key={lidx} style={{ marginLeft: "16px", fontSize: "13px", lineHeight: "1.6" }}>
                    {renderMarkdownInline(trimmed.slice(2))}
                  </li>
                );
              }

              const metricRegex = /^(📊|📈|🔋|💾|⚙️)?\s*([^:]+):\s*([\d.,%]+|Healthy|Operational|Active|Failed)$/i;
              const match = trimmed.match(metricRegex);
              if (match) {
                const [, emoji, label, value] = match;
                return (
                  <div className="ai-metric-stat-card" style={{ display: "inline-flex", flexDirection: "column", width: "180px", margin: "6px 6px 6px 0", verticalAlign: "top" }} key={lidx}>
                    <span className="ai-metric-val">{emoji ? `${emoji} ` : ""}{value}</span>
                    <span className="ai-metric-lbl">{renderMarkdownInline(label)}</span>
                  </div>
                );
              }

              return (
                <p key={lidx} style={{ margin: 0, fontSize: "13.5px", lineHeight: "1.6" }}>
                  {line}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="userBubbleWrap">
        <div className="msgHeader" style={{ textAlign: "right" }}>
          You · {formatTime(msg.timestamp)}
        </div>
        <div className="userBubble">
          <p className="userText">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="assistantWrap">
      <div className="msgHeader">
        <span style={{ color: "var(--accent)" }}>◆</span> Observatory Agent ·{" "}
        {formatTime(msg.timestamp)}
      </div>
      <div className="assistantBubble">
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div style={{ marginBottom: "12px" }}>
            <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Agent Tool Calls ({msg.toolCalls.length})
            </span>
            {msg.toolCalls.map((tool, idx) => (
              <ToolActivityBlock key={idx} tool={tool} />
            ))}
          </div>
        )}

        {msg.content ? (
          <div style={{ position: "relative" }}>
            <MessageContentRenderer content={msg.content} />
            {msg.streaming && (
              <span className="ai-cursor" aria-hidden="true" style={{ display: "inline-block", marginLeft: 4 }} />
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)", fontSize: "13.5px", padding: "4px 0" }}>
            <span className="ai-thinking" style={{ margin: 0 }}>
              <span />
              <span />
              <span />
            </span>
            <span>
              {msg.iteration !== undefined 
                ? `Agent reasoning (iteration ${msg.iteration + 1} of 5)...` 
                : "Agent is starting reasoning workflow..."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Workflow Diagram Component ──────────────────────────────────────────────

function WorkflowDiagram({ activeStep }: { activeStep: string }) {
  const steps = [
    { key: "query", label: "Query received" },
    { key: "agent", label: "Agent reasoning" },
    { key: "tools", label: "Tool execution" },
    { key: "response", label: "Answering" },
  ];

  return (
    <div className="ai-workflow-container">
      <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginRight: 8, flexShrink: 0 }}>
        Pipeline:
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", flex: 1, whiteSpace: "nowrap" }}>
        {steps.map((step, idx) => {
          const active = activeStep === step.key;
          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span 
                style={{ 
                  color: active ? "var(--accent)" : "var(--text-secondary)", 
                  fontWeight: active ? 600 : 400,
                  textShadow: active ? "0 0 8px rgba(212, 168, 50, 0.3)" : "none",
                  fontSize: "11px"
                }}
              >
                {active ? "● " : ""}{step.label}
              </span>
              {idx < steps.length - 1 && (
                <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "10px" }}>→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIPage() {
  const [auth, setAuth] = useState<AuthState>({ token: null, username: null });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentView, setCurrentView] = useState<"dashboard" | "chat">("dashboard");
  const [activeStep, setActiveStep] = useState<string>("idle");
  const [activeConfirmation, setActiveConfirmation] = useState<{
    confirmId: string;
    name: string;
    args: any;
  } | null>(null);

  const [statsLoading, setStatsLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");

  const OBS_LOAD_MESSAGES = [
    "🔒 Connecting securely to database pool...",
    "⚙️ Fetching backup execution details...",
    "📊 Aggregating repository telemetry logs...",
    "🧬 Analyzing system health signals...",
    "🔋 Syncing historical report archives...",
  ];

  useEffect(() => {
    if (statsLoading || sessionsLoading || messagesLoading) {
      setLoadMsg(OBS_LOAD_MESSAGES[Math.floor(Math.random() * OBS_LOAD_MESSAGES.length)]);
    }
  }, [statsLoading, sessionsLoading, messagesLoading]);

  const feedRef = useRef<HTMLDivElement>(null);

  // Add layout body class resets on mount
  useEffect(() => {
    document.documentElement.classList.add("ai-page-active");
    document.body.classList.add("ai-page-active");
    return () => {
      document.documentElement.classList.remove("ai-page-active");
      document.body.classList.remove("ai-page-active");
    };
  }, []);

  // Re-hydrate token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("agent_token");
    const username = localStorage.getItem("agent_username");
    if (token && username) {
      setAuth({ token, username });
    }
  }, []);

  // Fetch initial data on mount and whenever auth.token changes
  useEffect(() => {
    fetchSessions(auth.token);
    fetchStats(auth.token);
  }, [auth.token]);

  // Load active session messages
  useEffect(() => {
    if (activeSessionId) {
      loadMessages(auth.token, activeSessionId);
    } else {
      setMessages([]);
    }
  }, [auth.token, activeSessionId]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Database Operations ───────────────────────────────────────────────────

  const fetchSessions = useCallback(async (token?: string | null) => {
    setSessionsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${AGENT_URL}/sessions`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (token?: string | null) => {
    setStatsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${AGENT_URL}/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch stats", e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (token: string | null, sessionId: string) => {
    setMessagesLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${AGENT_URL}/sessions/${sessionId}/messages`, { headers });
      if (res.ok) {
        const data = await res.json();
        const formatted = (data.data || []).map((msg: any) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.created_at || Date.now()),
          toolCalls: msg.tool_calls || [],
        }));
        setMessages(formatted);
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const createSession = async () => {
    if (!auth.token) {
      setLoginError("Please sign in first to create a chat session.");
      const inputEl = document.getElementById("ai-username-inline");
      if (inputEl) inputEl.focus();
      return;
    }
    const newSessionId = crypto.randomUUID();
    try {
      const res = await fetch(`${AGENT_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          id: newSessionId,
          session_name: `Analytics Session`,
        }),
      });
      if (res.ok) {
        await fetchSessions(auth.token);
        setActiveSessionId(newSessionId);
        setMessages([]);
        setCurrentView("chat");
      }
    } catch (e) {
      console.error("Failed to create session", e);
    }
  };

  const renameSession = async (id: string, name: string) => {
    if (!auth.token || !name.trim()) return;
    try {
      const res = await fetch(`${AGENT_URL}/sessions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ session_name: name.trim() }),
      });
      if (res.ok) {
        setRenamingSessionId(null);
        await fetchSessions(auth.token);
      }
    } catch (e) {
      console.error("Failed to rename session", e);
    }
  };

  const deleteSession = async (id: string) => {
    if (!auth.token) return;
    try {
      const res = await fetch(`${AGENT_URL}/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        await fetchSessions(auth.token);
        fetchStats(auth.token);
        if (activeSessionId === id) {
          setActiveSessionId(null);
          setMessages([]);
          setCurrentView("dashboard");
        }
      }
    } catch (e) {
      console.error("Failed to delete session", e);
    }
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = useCallback(
    async (username: string, password: string) => {
      setLoginLoading(true);
      setLoginError(null);
      try {
        const form = new URLSearchParams();
        form.append("username", username);
        form.append("password", password);

        const res = await fetch(`${AGENT_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Invalid credentials");
        }

        const data = await res.json();
        const token: string = data.access_token;
        localStorage.setItem("agent_token", token);
        localStorage.setItem("agent_username", username);
        setAuth({ token, username });
      } catch (e: unknown) {
        setLoginError(e instanceof Error ? e.message : "Login failed");
      } finally {
        setLoginLoading(false);
      }
    },
    []
  );

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    localStorage.removeItem("agent_token");
    localStorage.removeItem("agent_username");
    setAuth({ token: null, username: null });
    setMessages([]);
    setSessions([]);
    setActiveSessionId(null);
    setCurrentView("dashboard");
  }, []);

  // ── Send message with streaming ────────────────────────────────────────────
  const sendMessage = useCallback(
    async (question: string) => {
      if (!auth.token || !question.trim() || sending) return;

      let sessionId = activeSessionId;
      if (!sessionId) {
        const newSessionId = crypto.randomUUID();
        try {
          const res = await fetch(`${AGENT_URL}/sessions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth.token}`,
            },
            body: JSON.stringify({
              id: newSessionId,
              session_name: question.trim().slice(0, 30) + (question.trim().length > 30 ? "..." : ""),
            }),
          });
          if (res.ok) {
            sessionId = newSessionId;
            setActiveSessionId(newSessionId);
            setCurrentView("chat");
            await fetchSessions(auth.token);
          }
        } catch (e) {
          console.error("Failed to create session on message send", e);
          return;
        }
      } else {
        setCurrentView("chat");
      }

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: question.trim(),
        timestamp: new Date(),
      };
      const assistantMsg: Message = {
        id: uid(),
        role: "assistant",
        content: "",
        streaming: true,
        timestamp: new Date(),
        toolCalls: [],
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setSending(true);
      setActiveStep("query");

      try {
        const res = await fetch(`${AGENT_URL}/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ question: question.trim(), session_id: sessionId }),
        });

        if (res.status === 401) {
          handleLogout();
          throw new Error("Session expired. Please sign in again.");
        }

        if (!res.ok || !res.body) {
          throw new Error(`Agent error: ${res.statusText}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (!dataStr) continue;

              try {
                const event = JSON.parse(dataStr);
                
                if (event.type === "info" || event.type === "agent_reasoning") {
                  setActiveStep("agent");
                  if (event.type === "agent_reasoning") {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsg.id
                          ? { ...m, iteration: event.iteration }
                          : m
                      )
                    );
                  }
                } else if (event.type === "confirm_required") {
                  setActiveConfirmation({
                    confirmId: event.confirm_id,
                    name: event.name,
                    args: event.args
                  });
                } else if (event.type === "tool_start") {
                  setActiveStep("tools");
                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id !== assistantMsg.id) return m;
                      const toolCalls = m.toolCalls || [];
                      if (toolCalls.some((t) => t.name === event.name)) return m;
                      return {
                        ...m,
                        toolCalls: [...toolCalls, { name: event.name, args: event.args, success: false, running: true, duration_ms: null }]
                      };
                    })
                  );
                } else if (event.type === "tool_end") {
                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id !== assistantMsg.id) return m;
                      const toolCalls = m.toolCalls || [];
                      return {
                        ...m,
                        toolCalls: toolCalls.map((t) =>
                          t.name === event.name
                            ? { ...t, success: event.success, running: false, duration_ms: event.duration_ms, result: event.result, error: event.error }
                            : t
                        )
                      };
                    })
                  );
                } else if (event.type === "token") {
                  setActiveStep("response");
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, content: m.content + event.text }
                        : m
                    )
                  );
                } else if (event.type === "done") {
                  setActiveStep("idle");
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, content: event.answer, streaming: false }
                        : m
                    )
                  );
                }
              } catch (err) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: m.content + dataStr }
                      : m
                  )
                );
              }
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: `⚠ ${msg}`, streaming: false }
              : m
          )
        );
      } finally {
        setSending(false);
        setActiveStep("idle");
        if (auth.token) {
          fetchStats(auth.token);
        }
      }
    },
    [auth.token, activeSessionId, sending, handleLogout, fetchSessions, fetchStats]
  );

  const handleConfirm = useCallback(async (approve: boolean) => {
    if (!activeConfirmation || !auth.token) return;
    const confirmId = activeConfirmation.confirmId;
    setActiveConfirmation(null);
    try {
      await fetch(`${AGENT_URL}/chat/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ confirm_id: confirmId, approve }),
      });
    } catch (e) {
      console.error("Failed to confirm action", e);
    }
  }, [activeConfirmation, auth.token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isLoggedIn = !!auth.token;

  return (
    <div className="page" style={{ padding: 0, margin: 0, maxWidth: "100%", height: "100%" }}>
      <div className="ai-dashboard-container">
        {/* Sidebar */}
        <aside className="ai-sidebar">
          <div className="ai-sidebar-header">
            <button className="ai-new-chat-btn" onClick={createSession}>
              <PlusIcon />
              New Analysis Chat
            </button>
          </div>
          
          <div className="ai-sidebar-list">
            <div 
              className={`ai-session-item ${currentView === "dashboard" && !activeSessionId ? "active" : ""}`}
              onClick={() => {
                setActiveSessionId(null);
                setMessages([]);
                setCurrentView("dashboard");
              }}
            >
              <div className="ai-session-title-wrap">
                <DashboardIcon />
                <span className="ai-session-title">Stats Dashboard</span>
              </div>
            </div>

            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", padding: "12px 12px 4px" }}>
              Chat History
            </div>

            {sessionsLoading && sessions.length === 0 ? (
              <div style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "12px", display: "flex", alignItems: "center", gap: 8 }}>
                <div className="ai-loader-spinner" style={{ width: 12, height: 12, borderWidth: 1.5, margin: 0 }} />
                <span>Syncing history...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: "12px 16px", color: "var(--text-faint)", fontSize: "12.5px" }}>
                No active conversations.
              </div>
            ) : (
              sessions.map((s) => (
                <div 
                  key={s.id}
                  className={`ai-session-item ${activeSessionId === s.id ? "active" : ""}`}
                >
                  <div className="ai-session-title-wrap" onClick={() => {
                    setActiveSessionId(s.id);
                    setCurrentView("chat");
                  }}>
                    <ChatIcon />
                    {renamingSessionId === s.id ? (
                      <input
                        className="ai-session-rename-input"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        onBlur={() => renameSession(s.id, renameInput)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameSession(s.id, renameInput);
                          if (e.key === "Escape") setRenamingSessionId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="ai-session-title">{s.session_name}</span>
                    )}
                  </div>
                  
                  {renamingSessionId !== s.id && (
                    <div className="ai-session-actions">
                      <button 
                        className="ai-session-action-btn"
                        onClick={() => {
                          setRenamingSessionId(s.id);
                          setRenameInput(s.session_name);
                        }}
                        disabled={!isLoggedIn}
                        aria-label="Rename Chat"
                      >
                        <EditIcon />
                      </button>
                      <button 
                        className="ai-session-action-btn delete"
                        onClick={() => deleteSession(s.id)}
                        disabled={!isLoggedIn}
                        aria-label="Delete Chat"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="ai-sidebar-footer">
            <div className="ai-sidebar-footer-row">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <DatabaseIcon />
                <span>DB Connected</span>
              </div>
              <span>v1.0.0</span>
            </div>
            <div className="ai-sidebar-footer-row" style={{ marginTop: 8 }}>
              {isLoggedIn ? (
                <>
                  <span style={{ color: "var(--text)" }}>{auth.username}</span>
                  <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={handleLogout}>
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <span style={{ color: "var(--text-secondary)" }}>Guest Mode</span>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: "4px 10px", fontSize: "11px", borderColor: "var(--accent)", color: "var(--accent)" }} 
                    onClick={() => {
                      const inputEl = document.getElementById("ai-username-inline");
                      if (inputEl) inputEl.focus();
                    }}
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Main Area */}
        <main className="ai-main-area">
          {/* Main view header */}
          <header className="ai-agent-header">
            <div className="ai-agent-identity">
              <div className="ai-agent-info">
                <div className="ai-agent-name">GitHub Backup Observatory Agent</div>
                <div className="ai-agent-status">
                  <span className={`ai-status-dot ${sending ? "busy" : ""}`} />
                  <span>{sending ? "Processing Query..." : "Online · Ready to analyze telemetry"}</span>
                </div>
              </div>
            </div>
            
            {/* Dynamic Model & Tools info */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                <span>Active Model:</span>
                <code style={{ fontSize: "11px", color: "var(--accent)", textTransform: "none", background: "rgba(212, 168, 50, 0.06)", padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(212, 168, 50, 0.2)" }}>
                  {stats?.model_name || "loading..."}
                </code>
              </div>
              {isLoggedIn && (
                <button 
                  type="button"
                  className="ai-new-chat-btn" 
                  style={{ 
                    width: "auto",
                    padding: "4px 12px", 
                    fontSize: "11px", 
                    background: "rgba(212, 168, 50, 0.12)", 
                    borderColor: "var(--accent)", 
                    color: "var(--accent)",
                    marginTop: 0,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    whiteSpace: "nowrap",
                    flexShrink: 0
                  }}
                  onClick={() => {
                    sendMessage("Generate a full backup health report and email it to me.");
                  }}
                  disabled={sending}
                >
                  Generate & Email Report
                </button>
              )}
              <div className="ai-tools-list" style={{ marginTop: 0, flexShrink: 0 }}>
                <span className="ai-tool-badge active">Metrics</span>
                <span className="ai-tool-badge active">Backup Runs</span>
                <span className="ai-tool-badge active">Logs</span>
                <span className="ai-tool-badge active">Analytics</span>
              </div>
            </div>
          </header>

          {/* Sticky Pipeline Stepper (permanently visible on chat view) */}
          {currentView === "chat" && (
            <WorkflowDiagram activeStep={activeStep} />
          )}

          {/* Scrollable content area */}
          <div className="ai-content-scroll-area" ref={currentView === "chat" ? feedRef : null}>
            {currentView === "dashboard" ? (
              statsLoading && !stats ? (
                <LoaderPanel message={loadMsg} />
              ) : (
                <div className="ai-dashboard-panel">
                  <div style={{ marginBottom: "28px" }}>
                    <div className="page-kicker">Observatory Operations</div>
                    <h1 className="hero-title" style={{ margin: "4px 0" }}>Backup Agent Dashboard</h1>
                    <p className="hero-subtitle" style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      Real-time analysis statistics from agent database executions, success parameters, and tool call distribution metrics.
                    </p>
                  </div>

                  {/* Grid stats */}
                  <div className="ai-dashboard-grid">
                    <div className="ai-dashboard-card">
                      <div className="ai-card-title">Total Conversations</div>
                      <div className="ai-card-value">{stats?.total_conversations ?? 0}</div>
                    </div>
                    <div className="ai-dashboard-card">
                      <div className="ai-card-title">Agent Executions</div>
                      <div className="ai-card-value">{stats?.total_agent_runs ?? 0}</div>
                    </div>
                    <div className="ai-dashboard-card">
                      <div className="ai-card-title">Model Success Rate</div>
                      <div className="ai-card-value" style={{ color: "var(--accent)" }}>
                        {stats ? `${stats.success_rate.toFixed(1)}%` : "100.0%"}
                      </div>
                    </div>
                    <div className="ai-dashboard-card">
                      <div className="ai-card-title">Database Memory</div>
                      <div className="ai-card-value">{stats?.memory_stats.total_messages ?? 0} msgs</div>
                    </div>
                  </div>

                  {/* Live Tool Calls Distribution */}
                  <div className="ai-dashboard-section-title">Telemetry Tool Call Statistics</div>
                  <div className="ai-rich-table-container" style={{ marginBottom: 32 }}>
                    <table className="ai-rich-table">
                      <thead>
                        <tr>
                          <th>Tool Name</th>
                          <th>Invocations</th>
                          <th>Avg Latency</th>
                          <th>Success Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats?.tool_usage && stats.tool_usage.length > 0 ? (
                          stats.tool_usage.map((tool, idx) => (
                            <tr key={idx}>
                              <td style={{ fontFamily: "monospace", color: "var(--accent)", fontSize: "12.5px" }}>{tool.name}</td>
                              <td>{tool.count} runs</td>
                              <td>{tool.avg_duration.toFixed(0)} ms</td>
                              <td>
                                <span className={`badge ${tool.success_rate > 90 ? "badge-success" : "badge-warning"}`}>
                                  {tool.success_rate.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ textAlign: "center", color: "var(--text-secondary)", padding: 20 }}>
                              No tool call logs recorded in the database yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Recent Activity & Pipeline Info */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
                    <div>
                      <div className="ai-dashboard-section-title">Recent Agent Tasks</div>
                      <div className="ai-recent-activity-list">
                        {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                          stats.recent_activity.map((act) => (
                            <div className="ai-activity-row" key={act.request_id}>
                              <div className="ai-activity-info">
                                <span className="ai-activity-question">"{act.question}"</span>
                                <span className="ai-activity-time">{formatDate(act.created_at)}</span>
                              </div>
                              <span className={`badge ${act.status === "completed" ? "badge-success" : "badge-error"}`}>
                                {act.status}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: 16, textAlign: "center", color: "var(--text-secondary)" }}>
                            No recent agent tasks logged.
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="ai-dashboard-section-title">Agent System Details</div>
                      <div className="ai-dashboard-card" style={{ height: "calc(100% - 40px)", display: "flex", flexDirection: "column", gap: 12 }}>
                        <div>
                          <strong style={{ fontSize: "13px", display: "block" }}>Identity & Branding</strong>
                          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                            Model: <code style={{ fontSize: "11px", textTransform: "none" }}>{stats?.model_name || "loading..."}</code>. Security via JWT Bearer Token, fully authenticated and logged.
                          </p>
                        </div>
                        <div>
                          <strong style={{ fontSize: "13px", display: "block" }}>Reasoning Pipeline</strong>
                          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                            Processes natural query {"→"} matches telemetry tools {"→"} loads Neon SQL session memory {"→"} generates contextual response.
                          </p>
                        </div>
                        <div>
                          <strong style={{ fontSize: "13px", display: "block" }}>Observability Parameters</strong>
                          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                            Database status: <span style={{ color: "#22c55e", fontWeight: "bold" }}>{stats?.system_health.database ?? "Healthy"}</span>.
                            API status: <span style={{ color: "#22c55e", fontWeight: "bold" }}>Operational</span>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Prompts if starting */}
                  <div className="ai-dashboard-section-title">Ask the Agent About Backups</div>
                  <div className="premadeGrid" style={{ marginTop: 12 }}>
                    {PREMADE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="premadeBtn"
                        onClick={() => sendMessage(prompt)}
                        disabled={sending}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : (
              /* Chat view */
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Chat messages */}
                <div className="ai-chat-messages">
                  {messagesLoading && messages.length === 0 ? (
                    <LoaderPanel message={loadMsg} />
                  ) : messages.length === 0 ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px", color: "var(--text-secondary)", fontSize: "14px" }}>
                      No messages in this chat session yet. Ask a question below to start.
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fixed Composer Wrap at the bottom of both views */}
          <div className="ai-chat-composer-wrap">
            {isLoggedIn ? (
              <form onSubmit={handleSubmit} className="composerWrap" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12, padding: "10px 14px" }}>
                <textarea
                  id="ai-composer"
                  className="composer"
                  style={{ flex: 1, minHeight: "38px", height: "38px", maxHeight: "80px", resize: "none", margin: 0, padding: "8px 12px", display: "flex", alignItems: "center" }}
                  placeholder={currentView === "dashboard" ? "Type here to start a new analysis chat..." : "Ask the agent anything about your backups..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  disabled={sending}
                  rows={1}
                  aria-label="Message to agent"
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <button
                    id="ai-send-btn"
                    type="submit"
                    className="sendBtn"
                    style={{ height: "32px", padding: "0 16px", marginTop: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12.5px" }}
                    disabled={sending || !input.trim()}
                  >
                    {sending ? "Processing…" : "Execute Reasoning →"}
                  </button>
                  <span className="promptHint" style={{ fontSize: "10px", margin: 0, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {sending
                      ? "Agent reasoning…"
                      : "Enter to send · Shift+Enter new line"}
                  </span>
                </div>
              </form>
            ) : (
              <div className="composerWrap" style={{ flexDirection: "column", gap: 12, alignItems: "stretch", padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span style={{ fontSize: "13.5px", fontWeight: 600 }}>Sign in to ask the agent questions and run telemetry tools</span>
                </div>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const u = (document.getElementById("ai-username-inline") as HTMLInputElement)?.value;
                    const p = (document.getElementById("ai-password-inline") as HTMLInputElement)?.value;
                    if (u && p) handleLogin(u, p);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
                >
                  <input
                    id="ai-username-inline"
                    type="text"
                    className="ai-login-input"
                    placeholder="Username"
                    autoComplete="username"
                    style={{ flex: 1, minWidth: 140, margin: 0, height: 38, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", padding: "0 10px" }}
                    required
                  />
                  <input
                    id="ai-password-inline"
                    type="password"
                    className="ai-login-input"
                    placeholder="Password"
                    autoComplete="current-password"
                    style={{ flex: 1, minWidth: 140, margin: 0, height: 38, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", padding: "0 10px" }}
                    required
                  />
                  <button
                    type="submit"
                    className="sendBtn"
                    style={{ height: 38, padding: "0 20px", marginTop: 0 }}
                    disabled={loginLoading}
                  >
                    {loginLoading ? "Authenticating..." : "Unlock Chat"}
                  </button>
                  {loginError && (
                    <span style={{ color: "#ef4444", fontSize: "12px", marginLeft: 4 }}>
                      ⚠ {loginError}
                    </span>
                  )}
                </form>
              </div>
            )}
          </div>
        </main>
      </div>

      {activeConfirmation && (
        <div className="ai-confirm-overlay">
          <div className="ai-confirm-modal">
            <h3>Confirm Sensitive Action</h3>
            <p>
              The agent wants to execute the tool <code>{activeConfirmation.name}</code> to send an email report:
            </p>
            <div className="ai-confirm-details">
              <div><strong>Subject:</strong> {activeConfirmation.args?.subject}</div>
              <div style={{ marginTop: 4 }}><strong>Recipients:</strong> {activeConfirmation.args?.recipients?.join(", ") || "Default Recipient (SMTP_TO)"}</div>
            </div>
            <div className="ai-confirm-actions">
              <button 
                type="button"
                className="ai-confirm-btn" 
                onClick={() => handleConfirm(true)}
              >
                Yes, Send Email
              </button>
              <button 
                type="button"
                className="ai-confirm-btn-abort" 
                onClick={() => handleConfirm(false)}
              >
                No, Abort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
