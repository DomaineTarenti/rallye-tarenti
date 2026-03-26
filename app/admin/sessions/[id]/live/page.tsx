"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Users, Clock, Hexagon, AlertTriangle, Unlock, MessageSquare,
  Timer, StopCircle, RefreshCw, CheckCircle2, Loader2, ChevronDown,
} from "lucide-react";
import { Loader } from "@/components/shared";
import { supabase } from "@/lib/supabase";
import { getRank } from "@/lib/scoring";
import type { ApiResponse, Session, TeamCharacter } from "@/lib/types";

const PAGE_SIZE = 50;

interface EnrichedTeam {
  id: string;
  name: string;
  character: string | null;
  status: string;
  final_score: number | null;
  created_at: string;
  completed_steps: number;
  total_steps: number;
  current_step: number;
  hints_used: number;
  elapsed_seconds: number;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseCharacter(char: string | null): TeamCharacter | null {
  if (!char) return null;
  try { return JSON.parse(char); } catch { return null; }
}

export default function LiveDashboard() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<EnrichedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Debounce ref for Realtime updates
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sessRes, teamsRes] = await Promise.all([
        fetch("/api/session?all=true"),
        fetch(`/api/teams?session_id=${sessionId}`),
      ]);
      const sessJson: ApiResponse = await sessRes.json();
      const teamsJson: ApiResponse = await teamsRes.json();

      if (sessJson.data) {
        const all = sessJson.data as Session[];
        setSession(all.find((s) => s.id === sessionId) ?? null);
      }
      if (teamsJson.data) {
        setTeams(teamsJson.data as EnrichedTeam[]);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [sessionId]);

  // Debounced reload — coalesces rapid Realtime events
  const debouncedReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadData();
    }, 500);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  // Single Realtime subscription for ALL team_progress + teams changes
  useEffect(() => {
    const channel = supabase
      .channel(`live-dashboard-${sessionId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "team_progress",
      }, debouncedReload)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "teams",
      }, debouncedReload)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [sessionId, debouncedReload]);

  // Timer tick every 10s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  async function unlockStep(teamId: string) {
    setActionLoading(`unlock-${teamId}`);
    try {
      await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId, step_id: "__auto__", success: true }),
      });
      await loadData();
    } catch { /* silent */ }
    setActionLoading(null);
  }

  async function emergencyStop() {
    if (!confirm("Stop this session? All teams will be paused.")) return;
    setActionLoading("stop");
    try {
      await fetch("/api/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, status: "paused" }),
      });
      await loadData();
    } catch { /* silent */ }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader text="Loading live dashboard..." />
      </div>
    );
  }

  const playingTeams = teams.filter((t) => t.status === "playing");
  const finishedTeams = teams.filter((t) => t.status === "finished");

  const sorted = [...teams].sort((a, b) => {
    if (b.completed_steps !== a.completed_steps) return b.completed_steps - a.completed_steps;
    return a.elapsed_seconds - b.elapsed_seconds;
  });

  const visibleTeams = sorted.slice(0, visibleCount);
  const hasMore = sorted.length > visibleCount;

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
              Live Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {session?.name} · {playingTeams.length} playing · {finishedTeams.length} finished · {teams.length} total
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button onClick={emergencyStop} disabled={actionLoading === "stop"} className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
              <StopCircle className="h-3.5 w-3.5" /> Emergency Stop
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <Users className="mb-1 h-4 w-4 text-indigo-500" />
            <p className="text-2xl font-bold">{teams.length}</p>
            <p className="text-xs text-gray-500">Total teams</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <Hexagon className="mb-1 h-4 w-4 text-green-500" />
            <p className="text-2xl font-bold">{playingTeams.length}</p>
            <p className="text-xs text-gray-500">Playing now</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <CheckCircle2 className="mb-1 h-4 w-4 text-blue-500" />
            <p className="text-2xl font-bold">{finishedTeams.length}</p>
            <p className="text-xs text-gray-500">Finished</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <AlertTriangle className="mb-1 h-4 w-4 text-amber-500" />
            <p className="text-2xl font-bold">
              {teams.filter((t) => t.status === "playing" && t.hints_used > 2).length}
            </p>
            <p className="text-xs text-gray-500">Struggling</p>
          </div>
        </div>

        {/* Teams table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Live Rankings</h2>
            <span className="text-xs text-gray-400">
              Showing {visibleTeams.length} of {sorted.length}
            </span>
          </div>

          {sorted.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">No teams have joined yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500">
                    <th className="px-4 py-2.5 font-medium">#</th>
                    <th className="px-4 py-2.5 font-medium">Team</th>
                    <th className="px-4 py-2.5 font-medium">Chapter</th>
                    <th className="px-4 py-2.5 font-medium">Score</th>
                    <th className="px-4 py-2.5 font-medium">Rank</th>
                    <th className="px-4 py-2.5 font-medium">Time</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTeams.map((team, i) => {
                    const char = parseCharacter(team.character);
                    const score = team.final_score ?? Math.max(0, 1000 - team.hints_used * 15);
                    const rank = getRank(score);
                    const elapsed = team.elapsed_seconds + tick * 10;
                    const isStuck = team.status === "playing" && team.hints_used > 2;

                    return (
                      <tr key={team.id} className={`border-b border-gray-50 ${isStuck ? "bg-amber-50/50" : ""}`}>
                        <td className="px-4 py-3 font-bold text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {char && (
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm" style={{ backgroundColor: char.color + "25" }}>
                                {char.animalEmoji}
                              </span>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{team.name}</p>
                              {char?.teamCode && <p className="font-mono text-[10px] text-gray-400">{char.teamCode}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700">{team.completed_steps}/{team.total_steps}</span>
                          <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${team.total_steps > 0 ? (team.completed_steps / team.total_steps) * 100 : 0}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-amber-600">{score}</td>
                        <td className="px-4 py-3">
                          {rank.key && (
                            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                              rank.key === "diamond" ? "bg-cyan-50 text-cyan-700"
                              : rank.key === "platinum" ? "bg-purple-50 text-purple-700"
                              : rank.key === "gold" ? "bg-amber-50 text-amber-700"
                              : rank.key === "silver" ? "bg-gray-100 text-gray-600"
                              : "bg-orange-50 text-orange-700"
                            }`}>{rank.label}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono text-xs">{formatElapsed(elapsed)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                            team.status === "playing" ? (isStuck ? "bg-amber-100 text-amber-700" : "bg-green-50 text-green-700")
                            : team.status === "finished" ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-500"
                          }`}>{isStuck ? "Stuck" : team.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => unlockStep(team.id)} disabled={team.status !== "playing" || actionLoading === `unlock-${team.id}`} title="Unlock step" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-30">
                              {actionLoading === `unlock-${team.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
                            </button>
                            <button title="Send message" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"><MessageSquare className="h-3.5 w-3.5" /></button>
                            <button title="Add 15 minutes" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600"><Timer className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {hasMore && (
            <div className="border-t border-gray-100 px-5 py-3 text-center">
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="flex items-center gap-1 mx-auto text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                <ChevronDown className="h-4 w-4" />
                Show more ({sorted.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
