"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Compass, Users, AlertCircle, Clock, KeyRound } from "lucide-react";
import { Button, Card, Loader } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import { applySessionTheme } from "@/lib/theme";
import type { Session, ApiResponse } from "@/lib/types";

function JoinContent() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code") ?? "";

  const setSession = usePlayerStore((s) => s.setSession);
  const storedSession = usePlayerStore((s) => s.session);

  const [session, setLocalSession] = useState<Session | null>(storedSession);
  const [loading, setLoading] = useState(!storedSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError("No Access Key provided.");
      setLoading(false);
      return;
    }

    if (storedSession && storedSession.code === code.toUpperCase()) {
      setLocalSession(storedSession);
      if (storedSession.primary_color || storedSession.logo_url) {
        applySessionTheme(storedSession);
      }
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchSession() {
      try {
        const res = await fetch(`/api/session?code=${encodeURIComponent(code)}`);
        const json: ApiResponse<Session> = await res.json();

        if (cancelled) return;

        if (!res.ok || json.error || !json.data) {
          setError(json.error ?? "Session not found. Please check your Access Key.");
          setLoading(false);
          return;
        }

        const s = json.data;

        if (s.status !== "active") {
          setError(
            s.status === "draft"
              ? "This session has not yet begun."
              : s.status === "completed"
              ? "This session has ended."
              : "This session is currently paused."
          );
          setLoading(false);
          return;
        }

        setSession(s);
        setLocalSession(s);
        if (s.primary_color || s.logo_url) {
          applySessionTheme(s);
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Connection error. Please check your network.");
          setLoading(false);
        }
      }
    }

    fetchSession();
    return () => { cancelled = true; };
  }, [code, storedSession, setSession]);

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-6">
        <Loader text="Searching for session..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-6">
        <Card className="w-full max-w-sm bg-surface text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h2 className="mb-2 text-lg font-bold">Something went wrong</h2>
          <p className="mb-6 text-sm text-gray-400">{error}</p>
          <Button onClick={() => router.push("/")} variant="secondary" className="w-full">
            Go back
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-6">
      {/* Logo / icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20">
        {session?.logo_url ? (
          <img src={session.logo_url} alt={session.name} className="h-14 w-14 rounded-xl object-contain" />
        ) : (
          <Compass className="h-10 w-10 text-primary" />
        )}
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold">{session?.name}</h1>

      {session?.theme && (
        <p className="mb-6 text-center italic text-gray-400">{session.theme}</p>
      )}

      <Card className="mb-6 w-full max-w-sm bg-surface">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <KeyRound className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-gray-300">
              Access Key: <span className="font-mono font-bold text-white">{session?.code}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-gray-300">
              Duration: <span className="font-bold text-white">{session?.duration_minutes} min</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Users className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-gray-300">Forge your fellowship to begin</span>
          </div>
        </div>
      </Card>

      <Button onClick={() => router.push("/character")} size="lg" className="w-full max-w-sm">
        Enter the Archive
      </Button>

      <button
        onClick={() => router.push("/")}
        className="mt-4 text-sm text-gray-500 transition hover:text-gray-300"
      >
        Change Access Key
      </button>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-[100dvh] items-center justify-center px-6 pb-6">
        <Loader text="Loading..." />
      </main>
    }>
      <JoinContent />
    </Suspense>
  );
}
