"use client";

import type React from "react";
import { createContext, useContext, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSessions } from "@/hooks/useSessions";
import type { AuthState, Session } from "@/types";

interface AIContextType {
  auth: AuthState;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;

  sessions: Session[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  createSession: (id: string, name: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  currentView: "dashboard" | "chat";
  setCurrentView: (view: "dashboard" | "chat") => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIContextProvider({ children }: { children: React.ReactNode }) {
  const authData = useAuth();
  const {
    auth,
    isAuthenticated,
    loading: authLoading,
    error: authError,
    login,
    logout,
  } = authData;

  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    createSession,
    renameSession,
    deleteSession,
  } = useSessions(auth.token);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"dashboard" | "chat">(
    "dashboard",
  );

  // Reset chat view states on logout
  const handleLogout = () => {
    logout();
    setActiveSessionId(null);
    setCurrentView("dashboard");
  };

  return (
    <AIContext.Provider
      value={{
        auth,
        isAuthenticated,
        authLoading,
        authError,
        login,
        logout: handleLogout,
        sessions,
        sessionsLoading,
        sessionsError,
        createSession,
        renameSession,
        deleteSession,
        activeSessionId,
        setActiveSessionId,
        currentView,
        setCurrentView,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAIContext must be used within an AIContextProvider");
  }
  return context;
}
