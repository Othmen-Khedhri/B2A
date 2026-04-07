import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import api from "../services/api";

export type Role = "admin" | "manager" | "collaborator";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  level: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: (reason?: "inactivity" | "remote") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Constants ─────────────────────────────────────────────────────────────────
const INACTIVITY_MS  = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
const BC_CHANNEL_NAME = "b2a_auth";

// ─── BroadcastChannel message types ────────────────────────────────────────────
type BcMessage = { type: "LOGOUT"; reason?: string };

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inactivityTimer         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bc                      = useRef<BroadcastChannel | null>(null);

  // ── Clear session state without calling the API ──────────────────────────────
  const clearSession = useCallback(() => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("user");
    setUser(null);
  }, []);

  // ── Reset the 15-min inactivity countdown ────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      // Flag the reason so the Login page can display the message
      sessionStorage.setItem("sessionExpiredReason", "inactivity");
      clearSession();
      window.location.href = "/login";
    }, INACTIVITY_MS);
  }, [clearSession]);

  // ── Attach / detach activity listeners ──────────────────────────────────────
  const startActivityTracking = useCallback(() => {
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer(); // start the clock immediately
  }, [resetTimer]);

  const stopActivityTracking = useCallback(() => {
    ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, resetTimer));
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  }, [resetTimer]);

  // ── On mount: restore session from sessionStorage + open BroadcastChannel ───
  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    const token  = sessionStorage.getItem("accessToken");
    if (stored && token) {
      setUser(JSON.parse(stored) as AuthUser);
      startActivityTracking();
    }
    setIsLoading(false);

    // Listen for logout events from other tabs of the same origin
    bc.current = new BroadcastChannel(BC_CHANNEL_NAME);
    bc.current.onmessage = (e: MessageEvent<BcMessage>) => {
      if (e.data?.type === "LOGOUT") {
        clearSession();
        // Don't re-broadcast; just redirect
        window.location.href = "/login";
      }
    };

    return () => {
      bc.current?.close();
      stopActivityTracking();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    sessionStorage.setItem("accessToken", data.accessToken);
    sessionStorage.setItem("refreshToken", data.refreshToken);
    sessionStorage.setItem("user", JSON.stringify(data.user));
    // Clear any leftover expiry reason from a previous session
    sessionStorage.removeItem("sessionExpiredReason");
    setUser(data.user as AuthUser);
    startActivityTracking();
  };

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = useCallback((reason?: "inactivity" | "remote") => {
    const refreshToken = sessionStorage.getItem("refreshToken");

    // Call the backend logout endpoint to blacklist the refresh token.
    // Fire-and-forget — we clear client state immediately regardless.
    if (refreshToken) {
      api.post("/auth/logout", { refreshToken }).catch(() => {});
    }

    stopActivityTracking();
    clearSession();

    // Broadcast to all other tabs of the same origin
    if (reason !== "remote") {
      bc.current?.postMessage({ type: "LOGOUT" } satisfies BcMessage);
    }
  }, [clearSession, stopActivityTracking]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
