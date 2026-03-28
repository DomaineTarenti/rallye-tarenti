"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Compass, Users, AlertCircle, Clock, KeyRound, RotateCcw } from "lucide-react";
import { Button, Card, Input, Loader } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import { applySessionTheme } from "@/lib/theme";
import type { Session, ApiResponse, Step, TeamProgress, TeamCharacter } from "@/lib/types";

function JoinContent() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code") ?? "";
  const teamCode = params.get("team") ?? "";

  const setSession = usePlayerStore((s) => s.setSession);
  const setTeam = usePlayerStore((s) => s.setTeam);
  const setTeamCharacter = usePlayerStore((s) => s.setTeamCharacter);
  const setSteps = usePlayerStore((s) => s.setSteps);
  const setObjects = usePlayerStore((s) => s.setObjects);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setCurrentStep = usePlayerStore((s) => s.setCurrentStep);
  const setCurrentStepIndex = usePlayerStore((s) => s.setCurrentStepIndex);
  const setCollectedLetters = usePlayerStore((s) => s.setCollectedLetters);
  const storedSession = usePlayerStore((s) => s.session);
  const storedTeam = usePlayerStore((s) => s.team);

  const [session, setLocalSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recovery state
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Join a pre-created team directly
  async function joinPrecreatedTeam(accessCode: string) {
    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: accessCode }),
      });
      const json: ApiResponse = await res.json();
      if (!res.ok || json.error || !json.data) {
        setError("Session or team not found. Check your code.");
        setLoading(false);
        return;
      }
      const data = json.data as Record<string, unknown>;
      setSession(data.session as never);
      setTeam(data.team as never);
      setObjects(data.objects as never[]);
      setSteps(data.steps as never[]);
      setProgress(data.progress as never[]);
      if ((data.team as Record<string, unknown>).collected_letters) {
        setCollectedLetters((data.team as Record<string, unknown>).collected_letters as Record<string, string>);
      }

      const stepsArr = data.steps as Array<Record<string, unknown>>;
      if (stepsArr.length > 0) setCurrentStep(stepsArr[0] as never);

      // Go to character selection (simplified — just pick animal/color)
      router.push("/character");
    } catch {
      setError("Connection error.");
      setLoading(false);
    }
  }

  useEffect(() => {
    // If a team code is provided, join directly
    if (teamCode) {
      joinPrecreatedTeam(teamCode);
      return;
    }

    if (!code) { setError("No Access Key provided."); setLoading(false); return; }

    // If team already exists for this session, resume directly
    if (storedSession && storedTeam && storedSession.code === code.toUpperCase()) {
      router.push("/navigate");
      return;
    }

    if (storedSession && storedSession.code === code.toUpperCase()) {
      setLocalSession(storedSession);
      if (storedSession.primary_color || storedSession.logo_url) applySessionTheme(storedSession);
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
          // Session not found — try as team access code
          joinPrecreatedTeam(code.trim().toUpperCase());
          return;
        }

        // New session — clear any stale data from previous session
        if (storedSession && storedSession.id !== json.data.id) {
          usePlayerStore.getState().reset();
        }
        const s = json.data;
        if (s.status !== "active") {
          setError(s.status === "draft" ? "This session has not yet begun." : s.status === "completed" ? "This session has ended." : "This session is currently paused.");
          setLoading(false);
          return;
        }
        setSession(s);
        setLocalSession(s);
        if (s.primary_color || s.logo_url) applySessionTheme(s);
        setLoading(false);
      } catch {
        if (!cancelled) { setError("Connection error."); setLoading(false); }
      }
    }
    fetchSession();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, teamCode]);

  async function handleRecover() {
    if (!recoveryCode.trim() || !session) return;
    setRecovering(true);
    setRecoveryError(null);

    try {
      const res = await fetch(`/api/team?code=${encodeURIComponent(recoveryCode.trim().toUpperCase())}&session_id=${session.id}`);
      const json: ApiResponse = await res.json();

      if (!res.ok || json.error || !json.data) {
        setRecoveryError(json.error ?? "Fellowship not found.");
        setRecovering(false);
        return;
      }

      const data = json.data as Record<string, unknown>;
      const team = data.team as Record<string, unknown>;
      const steps = data.steps as Step[];
      const progress = data.progress as TeamProgress[];

      // Restore state
      setTeam(team as never);
      setObjects(data.objects as never[]);
      setSteps(steps as never);
      setProgress(progress as never);

      // Parse character
      try {
        const char = JSON.parse(team.character as string) as TeamCharacter;
        setTeamCharacter(char);
      } catch { /* no character data */ }

      // Find active step index (don't set currentStep — player must scan)
      const activeProgress = progress.find((p) => p.status === "active");
      if (activeProgress) {
        const idx = steps.findIndex((s) => s.id === activeProgress.step_id);
        if (idx >= 0) setCurrentStepIndex(idx);
      }

      router.push("/navigate");
    } catch {
      setRecoveryError("Connection error.");
      setRecovering(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-6 pb-6">
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
          <Button onClick={() => router.push("/")} variant="secondary" className="w-full">Go back</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-6">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20">
        {session?.logo_url ? (
          <img src={session.logo_url} alt={session.name} className="h-14 w-14 rounded-xl object-contain" />
        ) : (
          <Compass className="h-10 w-10 text-primary" />
        )}
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold">{session?.name}</h1>
      {session?.theme && <p className="mb-6 text-center italic text-gray-400">{session.theme}</p>}

      <Card className="mb-6 w-full max-w-sm bg-surface">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <KeyRound className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-gray-300">Access Key: <span className="font-mono font-bold text-white">{session?.code}</span></span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-gray-300">Duration: <span className="font-bold text-white">{session?.duration_minutes} min</span></span>
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

      {/* Recovery section */}
      <div className="mt-6 w-full max-w-sm">
        {!showRecovery ? (
          <button
            onClick={() => setShowRecovery(true)}
            className="flex w-full items-center justify-center gap-2 text-sm text-gray-500 transition hover:text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Already have a fellowship? Resume with your code
          </button>
        ) : (
          <Card className="bg-surface">
            <p className="mb-3 text-sm font-medium text-gray-300">Enter your Fellowship Code</p>
            <div className="flex gap-2">
              <Input
                id="recovery-code"
                name="recovery-code"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder="LIO42"
                maxLength={10}
                autoComplete="off"
                className="bg-deep text-center font-mono tracking-widest"
              />
              <Button onClick={handleRecover} disabled={!recoveryCode.trim() || recovering}>
                {recovering ? "..." : "Resume"}
              </Button>
            </div>
            {recoveryError && (
              <p className="mt-2 text-xs text-red-400">{recoveryError}</p>
            )}
          </Card>
        )}
      </div>

      <button onClick={() => router.push("/")} className="mt-4 text-sm text-gray-500 transition hover:text-gray-300">
        Change Access Key
      </button>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<main className="flex min-h-[100dvh] items-center justify-center"><Loader text="Loading..." /></main>}>
      <JoinContent />
    </Suspense>
  );
}
