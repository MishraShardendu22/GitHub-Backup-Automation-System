"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  streaming?: boolean;
  timestamp: Date;
}

interface AuthState {
  token: string | null;
  username: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const PREMADE_PROMPTS = [
  "What is the overall health of my backups?",
  "Show me the most recent backup run results.",
  "Which repositories have the highest failure rates?",
  "Summarise storage usage across all repositories.",
  "Are there any critical errors in the execution logs?",
  "Compare backup success rates over the last 30 days.",
];

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
      <p className="ai-login-label">Sign in to start chatting with the agent</p>
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
        <span style={{ color: "var(--accent)" }}>◆</span> Agent ·{" "}
        {formatTime(msg.timestamp)}
      </div>
      <div className="assistantBubble">
        {msg.content ? (
          <p
            className="fallbackMarkdown"
            style={{ whiteSpace: "pre-wrap", margin: 0 }}
          >
            {msg.content}
            {msg.streaming && (
              <span className="ai-cursor" aria-hidden="true" />
            )}
          </p>
        ) : (
          <span className="ai-thinking">
            <span />
            <span />
            <span />
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIPage() {
  const [auth, setAuth] = useState<AuthState>({ token: null, username: null });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);

  // Re-hydrate token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("agent_token");
    const username = localStorage.getItem("agent_username");
    if (token && username) setAuth({ token, username });
  }, []);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

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
  }, []);

  // ── Send message with streaming ────────────────────────────────────────────
  const sendMessage = useCallback(
    async (question: string) => {
      if (!auth.token || !question.trim() || sending) return;

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
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setSending(true);

      try {
        const res = await fetch(`${AGENT_URL}/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ question: question.trim() }),
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

          // Process SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const token = line.slice(6); // strip "data: "
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + token }
                    : m
                )
              );
            }
          }
        }

        // Mark streaming done
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, streaming: false } : m
          )
        );
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
      }
    },
    [auth.token, sending, handleLogout]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isLoggedIn = !!auth.token;

  return (
    <div className="page">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-grid">
        <div className="card hero-card">
          <div className="hero-glow" />
          <div className="hero-content">
            <div className="page-kicker">Agentic Intelligence</div>
            <h1 className="hero-title">AI Observatory</h1>
            <p className="hero-subtitle">
              Ask the backup agent anything — run health, failure patterns,
              storage trends, repository insights, and more.
            </p>
            <div className="hero-tags">
              <span className="pill">Streaming responses</span>
              <span className="pill">Tool-augmented agent</span>
              <span className="pill">Backup intelligence</span>
              <span className="pill">JWT-secured</span>
            </div>
          </div>
        </div>

        {/* Auth status card */}
        <div className="hero-stack">
          <div className="stat-card stat-card--compact" style={{ gridColumn: "1 / -1" }}>
            <div className="stat-label">Agent status</div>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span
                className={isLoggedIn ? "badge badge-success" : "badge badge-error"}
              >
                {isLoggedIn ? "Authenticated" : "Not signed in"}
              </span>
            </div>
            {isLoggedIn && (
              <>
                <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                  Signed in as <strong style={{ color: "var(--text)" }}>{auth.username}</strong>
                </div>
                <button
                  type="button"
                  id="ai-logout-btn"
                  className="btn btn-outline"
                  onClick={handleLogout}
                  style={{ marginTop: 12, fontSize: 11, padding: "5px 12px" }}
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Login Form (always visible when not authenticated) ─────────── */}
      {!isLoggedIn && (
        <section className="card section-card ai-login-section">
          <LoginPanel
            onLogin={handleLogin}
            loading={loginLoading}
            error={loginError}
          />
        </section>
      )}

      {/* ── Premade prompts ───────────────────────────────────────────────── */}
      {isLoggedIn && messages.length === 0 && (
        <section className="card section-card">
          <div className="section-title" style={{ marginBottom: 14 }}>
            Suggested questions
          </div>
          <div className="premadeGrid">
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
        </section>
      )}

      {/* ── Chat feed ─────────────────────────────────────────────────────── */}
      {messages.length > 0 && (
        <section className="card section-card">
          <div className="section-title" style={{ marginBottom: 14 }}>
            Conversation
          </div>
          <div className="chatFeed" ref={feedRef} id="ai-chat-feed">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </div>
        </section>
      )}

      {/* ── Composer ──────────────────────────────────────────────────────── */}
      <section className="card section-card">
        {!isLoggedIn ? (
          <p className="promptHint" style={{ textAlign: "center", padding: "8px 0" }}>
            🔒 Sign in above to interact with the AI agent.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="composerWrap">
            <textarea
              id="ai-composer"
              className="composer"
              placeholder="Ask the agent anything about your backups…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              disabled={sending}
              rows={3}
              aria-label="Message to agent"
            />
            <div className="composerActions">
              <span className="promptHint">
                {sending
                  ? "Agent is thinking…"
                  : "Press Enter to send · Shift+Enter for new line"}
              </span>
              <button
                id="ai-send-btn"
                type="submit"
                className="sendBtn"
                disabled={sending || !input.trim()}
              >
                {sending ? "Sending…" : "Send →"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
