"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, Users, LogOut, History,
} from "lucide-react";
import { useStaffStore } from "@/lib/staffStore";
import { supabase } from "@/lib/supabase";
import type { TeamCharacter } from "@/lib/types";

interface WaitingTeam {
  id: string;
  teamId: string;
  teamName: string;
  character: TeamCharacter | null;
  stepId: string;
  arrivedAt: number;
}

function parseChar(c: string | null): TeamCharacter | null {
  if (!c) return null;
  try { return JSON.parse(c); } catch { return null; }
}

export default function StaffDashboard() {
  const router = useRouter();
  const staffId = useStaffStore((s) => s.staffId);
  const staffName = useStaffStore((s) => s.staffName);
  const sessionName = useStaffStore((s) => s.sessionName);
  const sessionId = useStaffStore((s) => s.sessionId);
  const assignedStepId = useStaffStore((s) => s.assignedStepId);
  const validationCode = useStaffStore((s) => s.validationCode);
  const teamsValidated = useStaffStore((s) => s.teamsValidated);
  const incrementValidated = useStaffStore((s) => s.incrementValidated);
  const reset = useStaffStore((s) => s.reset);

  const [waitingTeam, setWaitingTeam] = useState<WaitingTeam | null>(null);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<"success" | "retry" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Redirect if not logged in
  useEffect(() => {
    if (mounted && !staffId) router.replace("/staff/login");
  }, [mounted, staffId, router]);

  // Listen for teams reaching our assigned step via Realtime
  useEffect(() => {
    if (!assignedStepId || !sessionId) return;

    const ch = supabase
      .channel(`staff-${staffId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "team_progress",
        filter: `step_id=eq.${assignedStepId}`,
      }, async (payload) => {
        const row = payload.new as { team_id: string; step_id: string; status: string; id: string };
        if (row.status !== "active") return;

        // Fetch team info
        const { data: team } = await supabase
          .from("teams")
          .select("id, name, character")
          .eq("id", row.team_id)
          .single();

        if (team) {
          // Vibrate if supported
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }

          setWaitingTeam({
            id: row.id,
            teamId: team.id,
            teamName: team.name,
            character: parseChar(team.character),
            stepId: row.step_id,
            arrivedAt: Date.now(),
          });
          setResult(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [assignedStepId, sessionId, staffId]);

  // Timer for waiting team
  useEffect(() => {
    if (!waitingTeam) { setElapsed(0); return; }
    const i = setInterval(() => {
      setElapsed(Math.floor((Date.now() - waitingTeam.arrivedAt) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, [waitingTeam]);

  // Check for already-waiting teams on mount
  const checkExisting = useCallback(async () => {
    if (!assignedStepId) return;
    const { data } = await supabase
      .from("team_progress")
      .select("id, team_id, step_id, status")
      .eq("step_id", assignedStepId)
      .eq("status", "active");

    if (data && data.length > 0) {
      const row = data[0];
      const { data: team } = await supabase
        .from("teams")
        .select("id, name, character")
        .eq("id", row.team_id)
        .single();

      if (team) {
        setWaitingTeam({
          id: row.id,
          teamId: team.id,
          teamName: team.name,
          character: parseChar(team.character),
          stepId: row.step_id,
          arrivedAt: Date.now(),
        });
      }
    }
  }, [assignedStepId]);

  useEffect(() => { if (mounted && staffId) checkExisting(); }, [mounted, staffId, checkExisting]);

  async function handleValidate(success: boolean) {
    if (!waitingTeam) return;
    setValidating(true);

    await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_id: waitingTeam.teamId,
        step_id: waitingTeam.stepId,
        success,
      }),
    });

    if (success) {
      // Also activate next step
      await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: waitingTeam.teamId, step_id: waitingTeam.stepId }),
      });
      incrementValidated();
      // Update staff counter in DB
      await supabase
        .from("staff_members")
        .update({ teams_validated: teamsValidated + 1 })
        .eq("id", staffId);
    }

    setResult(success ? "success" : "retry");
    setValidating(false);

    // Return to waiting after 3s
    setTimeout(() => {
      setWaitingTeam(null);
      setResult(null);
    }, 3000);
  }

  function handleLogout() {
    reset();
    router.push("/staff/login");
  }

  if (!mounted || !staffId) return null;

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;

  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Guardian: {staffName}</p>
            <p className="text-xs text-gray-500">{sessionName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/staff/history")} className="rounded-lg p-2 text-gray-400 hover:bg-surface hover:text-white">
              <History className="h-4 w-4" />
            </button>
            <button onClick={handleLogout} className="rounded-lg p-2 text-gray-400 hover:bg-surface hover:text-red-400">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* ── Result animation ── */}
        {result && (
          <div className="flex flex-col items-center">
            <div className={`mb-4 flex h-24 w-24 items-center justify-center rounded-full ${result === "success" ? "bg-green-500/20" : "bg-red-500/20"}`}>
              {result === "success" ? <CheckCircle2 className="h-14 w-14 text-green-400" /> : <XCircle className="h-14 w-14 text-red-400" />}
            </div>
            <h2 className="text-xl font-bold">{result === "success" ? "Challenge Validated!" : "Try Again"}</h2>
            <p className="mt-2 text-sm text-gray-400">Returning to standby...</p>
          </div>
        )}

        {/* ── Team arrived — validate ── */}
        {waitingTeam && !result && (
          <div className="w-full max-w-sm">
            <div className="mb-6 text-center">
              {waitingTeam.character && (
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl" style={{ backgroundColor: (waitingTeam.character.color ?? "#7F77DD") + "25" }}>
                  {waitingTeam.character.animalEmoji}
                </div>
              )}
              <h2 className="text-2xl font-bold">{waitingTeam.teamName}</h2>
              {waitingTeam.character?.teamCode && (
                <p className="mt-1 font-mono text-sm text-gray-400">{waitingTeam.character.teamCode}</p>
              )}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-gray-400">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-sm">{m}:{String(s).padStart(2, "0")}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleValidate(true)}
                disabled={validating}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 py-5 text-lg font-bold text-white transition active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="h-6 w-6" />
                Challenge Passed
              </button>
              <button
                onClick={() => handleValidate(false)}
                disabled={validating}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/20 py-3 text-sm font-medium text-red-400 transition active:scale-95 disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Waiting mode ── */}
        {!waitingTeam && !result && (
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
              <ShieldCheck className="h-10 w-10 animate-pulse text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Awaiting a team...</h2>
            <p className="mb-8 text-sm text-gray-400">
              You will be notified when a team reaches your station
            </p>

            {/* Validation code — big and visible */}
            <div className="mb-4 rounded-2xl border-2 border-primary/30 bg-surface p-6">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">Your validation code</p>
              <p className="font-mono text-5xl font-black tracking-[0.2em] text-primary">
                {validationCode ?? "----"}
              </p>
              <p className="mt-3 text-xs text-gray-500">
                Teams can use this code if network is unavailable
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>Teams validated: <span className="font-bold text-white">{teamsValidated}</span></span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
