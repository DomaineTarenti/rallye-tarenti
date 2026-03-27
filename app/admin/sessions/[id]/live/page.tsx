"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users, Clock, Hexagon, AlertTriangle, Unlock, MessageSquare,
  Timer, StopCircle, RefreshCw, CheckCircle2, Loader2, ChevronDown,
  X, Check, Flag, Send,
} from "lucide-react";
import { Loader } from "@/components/shared";
import { supabase } from "@/lib/supabase";
import { getRank } from "@/lib/scoring";
import type { ApiResponse, Session, TeamCharacter, Step } from "@/lib/types";

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

function formatElapsed(s: number) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; }
function parseChar(c: string | null): TeamCharacter | null { if (!c) return null; try { return JSON.parse(c); } catch { return null; } }

export default function LiveDashboard() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<EnrichedTeam[]>([]);
  const [allSteps, setAllSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Modal states
  const [msgModal, setMsgModal] = useState<{ teamId: string; teamName: string } | null>(null);
  const [msgText, setMsgText] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [unlockModal, setUnlockModal] = useState<{ teamId: string; teamName: string } | null>(null);
  const [unlockStepId, setUnlockStepId] = useState("");
  const [timeAdded, setTimeAdded] = useState<string | null>(null);
  const [helpAlert, setHelpAlert] = useState<{ teamName: string; step: number; message: string } | null>(null);
  const [helpTeamId, setHelpTeamId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sessRes, teamsRes, objRes] = await Promise.all([
        fetch("/api/session?all=true"),
        fetch(`/api/teams?session_id=${sessionId}`),
        fetch(`/api/objects?session_id=${sessionId}`),
      ]);
      const sessJson: ApiResponse = await sessRes.json();
      const teamsJson: ApiResponse = await teamsRes.json();
      const objJson: ApiResponse = await objRes.json();

      if (sessJson.data) {
        const all = sessJson.data as Session[];
        setSession(all.find((s) => s.id === sessionId) ?? null);
      }
      if (teamsJson.data) setTeams(teamsJson.data as EnrichedTeam[]);

      // Extract steps from objects
      if (objJson.data) {
        const objs = objJson.data as Array<{ steps?: Step[] }>;
        const steps = objs.flatMap((o) => o.steps ?? []).sort((a, b) => a.order - b.order);
        setAllSteps(steps);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [sessionId]);

  const debouncedReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadData(), 500);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const ch = supabase.channel(`live-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_progress" }, debouncedReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, debouncedReload)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages" }, (payload) => {
        const msg = payload.new as { message: string; type?: string; team_id?: string };
        if (msg.type === "help_request") {
          setHelpAlert({ teamName: "", step: 0, message: msg.message });
          setHelpTeamId(msg.team_id ?? null);
          // Sound notification
          try { new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1saWBnbXV3dnZxbW5ydHRxbnF0d3d0cG1vc3Z3dHBtb3N2d3RxbnF1eHd0cXF0eHl3dHJ0eHp5d3V1eXt6eHZ2eXt7eXd2eHp7end3eHp7e3p4eHp8fHt5eXt8fXt6ent9fn18e3x+f359fH1/gH9+fX6AgYB/fn+BgoGAf4CBgoKBgIGCg4OCgYKDhIOCgoOEhYSDg4SFhoWEhIWGh4aFhYaHiIeGhoeIiYiHh4iJioqJiImKi4uKiYqLjIyLiouMjY2Mi4yNjo6NjI2Oj4+OjY6PkJCPjo+QkZGQj5CRkpKRkJGSk5OSkZKTlJSTkpOU").play().catch(() => {}); } catch { /* no audio */ }
          // Change tab title
          document.title = "\u{1F198} The Quest — Help needed!";
          setTimeout(() => { document.title = "The Quest Admin"; setHelpAlert(null); setHelpTeamId(null); }, 15000);
        }
      })
      .subscribe();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); supabase.removeChannel(ch); };
  }, [sessionId, debouncedReload]);

  useEffect(() => { const i = setInterval(() => setTick((t) => t + 1), 10000); return () => clearInterval(i); }, []);

  // ── Actions ──

  async function sendMessage() {
    if (!msgModal || !msgText.trim()) return;
    setMsgSending(true);
    await fetch("/api/admin/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: msgModal.teamId, session_id: sessionId, message: msgText.trim() }),
    });
    setMsgSending(false);
    setMsgModal(null);
    setMsgText("");
  }

  async function doUnlock() {
    if (!unlockModal || !unlockStepId) return;
    setActionLoading(`unlock-${unlockModal.teamId}`);
    await fetch("/api/admin/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: unlockModal.teamId, step_id: unlockStepId }),
    });
    setUnlockModal(null);
    setUnlockStepId("");
    await loadData();
    setActionLoading(null);
  }

  async function addTime(teamId: string) {
    setActionLoading(`time-${teamId}`);
    await fetch("/api/admin/add-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId, minutes: 15 }),
    });
    setTimeAdded(teamId);
    setTimeout(() => setTimeAdded(null), 2000);
    setActionLoading(null);
  }

  async function emergencyStop() {
    if (!confirm("Pause this session immediately?")) return;
    setActionLoading("stop");
    await fetch("/api/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sessionId, status: "paused" }) });
    await loadData();
    setActionLoading(null);
  }

  async function endSession() {
    if (!confirm("End this session? The code will be regenerated and all teams locked.")) return;
    setActionLoading("end");
    await fetch("/api/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sessionId, status: "completed" }) });
    router.push(`/admin/sessions/${sessionId}/results`);
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader text="Loading..." /></div>;

  const playing = teams.filter((t) => t.status === "playing");
  const finished = teams.filter((t) => t.status === "finished");
  const sorted = [...teams].sort((a, b) => b.completed_steps !== a.completed_steps ? b.completed_steps - a.completed_steps : a.elapsed_seconds - b.elapsed_seconds);
  const visible = sorted.slice(0, visibleCount);

  return (
    <div className="p-6 lg:p-8">
      {/* Help request alert */}
      {helpAlert && (
        <div className="fixed left-4 right-4 top-4 z-50 flex items-center gap-3 rounded-xl bg-red-600 px-4 py-3 text-white shadow-xl" onClick={() => setHelpAlert(null)}>
          <span className="text-lg">{"\u{1F198}"}</span>
          <p className="flex-1 text-sm font-medium">{helpAlert.message}</p>
          <button className="text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" /> Live Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">{session?.name} · {playing.length} playing · {finished.length} finished</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button onClick={emergencyStop} disabled={actionLoading === "stop"} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100">
              <StopCircle className="h-3.5 w-3.5" /> Pause
            </button>
            <button onClick={endSession} disabled={actionLoading === "end"} className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
              <Flag className="h-3.5 w-3.5" /> End Session
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Users, color: "indigo", val: teams.length, label: "Total teams" },
            { icon: Hexagon, color: "green", val: playing.length, label: "Playing now" },
            { icon: CheckCircle2, color: "blue", val: finished.length, label: "Finished" },
            { icon: AlertTriangle, color: "amber", val: teams.filter((t) => t.status === "playing" && t.hints_used > 2).length, label: "Struggling" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
              <s.icon className={`mb-1 h-4 w-4 text-${s.color}-500`} />
              <p className="text-2xl font-bold">{s.val}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Live Rankings</h2>
            <span className="text-xs text-gray-400">{visible.length} / {sorted.length}</span>
          </div>

          {sorted.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">No teams yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="px-4 py-2.5 font-medium">#</th>
                  <th className="px-4 py-2.5 font-medium">Team</th>
                  <th className="px-4 py-2.5 font-medium">Chapter</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Rank</th>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {visible.map((team, i) => {
                    const ch = parseChar(team.character);
                    const sc = team.final_score ?? Math.max(0, 1000 - team.hints_used * 15);
                    const rk = getRank(sc);
                    const el = team.elapsed_seconds + tick * 10;
                    const stuck = team.status === "playing" && team.hints_used > 2;

                    return (
                      <tr key={team.id} className={`border-b border-gray-50 ${helpTeamId === team.id ? "bg-red-50 animate-pulse" : stuck ? "bg-amber-50/50" : ""}`}>
                        <td className="px-4 py-3 font-bold text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {ch && <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm" style={{ backgroundColor: ch.color + "25" }}>{ch.animalEmoji}</span>}
                            <div>
                              <p className="font-medium text-gray-900">{team.name}</p>
                              {ch?.teamCode && <p className="font-mono text-[10px] text-gray-400">{ch.teamCode}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700">{team.completed_steps}/{team.total_steps}</span>
                          <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${team.total_steps ? (team.completed_steps / team.total_steps) * 100 : 0}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-amber-600">{sc}</td>
                        <td className="px-4 py-3">
                          {rk.key && <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${rk.key === "diamond" ? "bg-cyan-50 text-cyan-700" : rk.key === "platinum" ? "bg-purple-50 text-purple-700" : rk.key === "gold" ? "bg-amber-50 text-amber-700" : rk.key === "silver" ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-700"}`}>{rk.label}</span>}
                        </td>
                        <td className="px-4 py-3"><div className="flex items-center gap-1 text-gray-500"><Clock className="h-3 w-3" /><span className="font-mono text-xs">{formatElapsed(el)}</span></div></td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${team.status === "playing" ? (stuck ? "bg-amber-100 text-amber-700" : "bg-green-50 text-green-700") : team.status === "finished" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{stuck ? "Stuck" : team.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {/* Unlock */}
                            <button onClick={() => { setUnlockModal({ teamId: team.id, teamName: team.name }); setUnlockStepId(""); }}
                              disabled={team.status !== "playing"} title="Unlock step"
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-30">
                              {actionLoading === `unlock-${team.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
                            </button>
                            {/* Message */}
                            <button onClick={() => { setMsgModal({ teamId: team.id, teamName: team.name }); setMsgText(""); }}
                              title="Send message" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600">
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                            {/* Add time */}
                            <button onClick={() => addTime(team.id)} disabled={actionLoading === `time-${team.id}`}
                              title="Add 15 minutes" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600">
                              {timeAdded === team.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Timer className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {sorted.length > visibleCount && (
            <div className="border-t border-gray-100 px-5 py-3 text-center">
              <button onClick={() => setVisibleCount((v) => v + PAGE_SIZE)} className="flex items-center gap-1 mx-auto text-sm font-medium text-indigo-600">
                <ChevronDown className="h-4 w-4" /> Show more ({sorted.length - visibleCount})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Message Modal ── */}
      {msgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMsgModal(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Message to {msgModal.teamName}</h3>
              <button onClick={() => setMsgModal(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={!msgText.trim() || msgSending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {msgSending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      )}

      {/* ── Unlock Modal ── */}
      {unlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setUnlockModal(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Unlock step for {unlockModal.teamName}</h3>
              <button onClick={() => setUnlockModal(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <select
              value={unlockStepId}
              onChange={(e) => setUnlockStepId(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
            >
              <option value="">Select a step...</option>
              {allSteps.map((s, i) => (
                <option key={s.id} value={s.id}>
                  Step {i + 1} — {s.type}{s.type === "enigme" && s.answer ? ` (${s.answer})` : ""}
                </option>
              ))}
            </select>
            <button
              onClick={doUnlock}
              disabled={!unlockStepId || actionLoading?.startsWith("unlock")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" />
              {actionLoading?.startsWith("unlock") ? "Unlocking..." : "Unlock Step"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
