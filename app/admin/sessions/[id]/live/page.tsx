"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users, Clock, Hexagon, AlertTriangle, Unlock, MessageSquare,
  Timer, StopCircle, RefreshCw, CheckCircle2, Loader2, ChevronDown,
  X, Check, Flag, Send, Bell, BellOff,
} from "lucide-react";
import { Loader } from "@/components/shared";
import { supabase } from "@/lib/supabase";
import type { ApiResponse, Session, Step } from "@/lib/types";

// Compatibilité legacy — scoring supprimé dans Rallye Tarenti
function getRank(_score: number) { return { label: "—", color: "#2D7D46", key: "bronze" }; }
type TeamCharacter = Record<string, string>;

const PAGE_SIZE = 50;

interface EnrichedTeam {
  id: string;
  name: string;
  character: string | null;
  status: string;
  final_score: number | null;
  created_at: string;
  started_at: string | null;
  completed_steps: number;
  total_steps: number;
  current_step: number;
  hints_used: number;
  elapsed_seconds: number;
  completion_time: number | null;
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
  const [search, setSearch] = useState("");

  // Modal states
  const [msgModal, setMsgModal] = useState<{ teamId: string; teamName: string } | null>(null);
  const [msgText, setMsgText] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; message: string; type: string; created_at: string }>>([]);
  const [unlockModal, setUnlockModal] = useState<{ teamId: string; teamName: string } | null>(null);
  const [unlockStepId, setUnlockStepId] = useState("");
  const [timeAdded, setTimeAdded] = useState<string | null>(null);
  const [helpAlert, setHelpAlert] = useState<{ teamName: string; step: number; message: string } | null>(null);
  const [helpTeamId, setHelpTeamId] = useState<string | null>(null);

  const [unreadTeams, setUnreadTeams] = useState<Set<string>>(new Set());
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof Notification === "undefined") { setNotifPermission("unsupported"); return; }
    setNotifPermission(Notification.permission);
  }, []);

  async function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }

  function sendBrowserNotif(title: string, body: string) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      new Notification(title, { body, icon: "/icon-192.png", tag: "rallye-alert" });
    } catch { /* silent */ }
  }
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const msgModalRef = useRef<{ teamId: string; teamName: string } | null>(null);
  useEffect(() => { msgModalRef.current = msgModal; }, [msgModal]);

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
          // Son d'alerte
          try { new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1saWBnbXV3dnZxbW5ydHRxbnF0d3d0cG1vc3Z3dHBtb3N2d3RxbnF1eHd0cXF0eHl3dHJ0eHp5d3V1eXt6eHZ2eXt7eXd2eHp7end3eHp7e3p4eHp8fHt5eXt8fXt6ent9fn18e3x+f359fH1/gH9+fX6AgYB/fn+BgoGAf4CBgoKBgIGCg4OCgYKDhIOCgoOEhYSDg4SFhoWEhIWGh4aFhYaHiIeGhoeIiYiHh4iJioqJiImKi4uKiYqLjIyLiouMjY2Mi4yNjo6NjI2Oj4+OjY6PkJCPjo+QkZGQj5CRkpKRkJGSk5OSkZKTlJSTkpOU").play().catch(() => {}); } catch { /* no audio */ }
          // Notification browser
          sendBrowserNotif("🆘 Aide demandée !", msg.message ?? "Une équipe a besoin d'aide");
          // Titre de l'onglet
          document.title = "\u{1F198} Rallye Tarenti — Help needed!";
          setTimeout(() => { document.title = "Rallye Tarenti Admin"; setHelpAlert(null); setHelpTeamId(null); }, 15000);
        }
        // Notification browser pour les messages joueurs
        if (msg.type === "player_message") {
          sendBrowserNotif("💬 Message d'une équipe", msg.message ?? "");
        }
        // Son discret pour les messages normaux des joueurs
        if (msg.type === "player_message") {
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
          } catch { /* no audio */ }
        }
        // Marquer l'équipe comme ayant des messages non lus si le chat n'est pas ouvert pour elle
        if ((msg.type === "player_message" || msg.type === "help_request") && msg.team_id) {
          if (msgModalRef.current?.teamId !== msg.team_id) {
            setUnreadTeams((prev) => {
              const next = new Set(prev);
              next.add(msg.team_id!);
              return next;
            });
          }
        }
      })
      .subscribe();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); supabase.removeChannel(ch); };
  }, [sessionId, debouncedReload]);

  // Tick toutes les 10s pour afficher le temps écoulé
  useEffect(() => { const i = setInterval(() => setTick((t) => t + 1), 10000); return () => clearInterval(i); }, []);

  // Auto-refresh des données toutes les 20s (fallback si Realtime ne reçoit pas les changements RLS)
  useEffect(() => { const i = setInterval(() => loadData(), 20000); return () => clearInterval(i); }, [loadData]);

  // ── Subscription Realtime sur les messages du chat ouvert ──
  useEffect(() => {
    if (!msgModal) return;
    const ch = supabase
      .channel(`chat-modal-${msgModal.teamId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "team_messages",
        filter: `team_id=eq.${msgModal.teamId}`,
      }, (payload) => {
        const msg = payload.new as { id: string; message: string; type: string; created_at: string };
        setChatHistory((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [msgModal?.teamId]);

  // ── Auto-scroll vers le bas à chaque nouveau message ──
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // ── Actions ──

  async function openChat(teamId: string, teamName: string) {
    setMsgModal({ teamId, teamName });
    setUnreadTeams((prev) => { const next = new Set(prev); next.delete(teamId); return next; });
    setMsgText("");
    setChatHistory([]);
    const { data } = await supabase
      .from("team_messages")
      .select("id, message, type, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true });
    if (data) setChatHistory(data);
  }

  async function sendMessage() {
    if (!msgModal || !msgText.trim()) return;
    setMsgSending(true);
    await fetch("/api/admin/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: msgModal.teamId, session_id: sessionId, message: msgText.trim() }),
    });
    setMsgText(""); // le message apparaîtra via la subscription Realtime
    setMsgSending(false);
  }

  async function doUnlockCurrentStep(teamId: string) {
    setActionLoading(`unlock-${teamId}`);
    // Find the team's current active step and complete it
    await fetch("/api/admin/skip-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId }),
    });
    // Clear help state for this team
    if (helpTeamId === teamId) {
      setHelpAlert(null);
      setHelpTeamId(null);
    }
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
  const statusOrder = (s: string) => s === "finished" ? 0 : s === "playing" ? 1 : 2;
  const sorted = [...teams]
    .filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const sa = statusOrder(a.status), sb = statusOrder(b.status);
      if (sa !== sb) return sa - sb;
      if (a.status === "finished") return (b.final_score ?? 0) - (a.final_score ?? 0);
      if (a.status === "playing") return b.completed_steps - a.completed_steps;
      return 0;
    });
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
            {notifPermission !== "unsupported" && notifPermission !== "granted" && (
              <button
                onClick={requestNotifPermission}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                title="Recevoir des alertes même si l'onglet est en arrière-plan"
              >
                <Bell className="h-3.5 w-3.5" /> Alertes
              </button>
            )}
            {notifPermission === "granted" && (
              <span className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                <Bell className="h-3.5 w-3.5" /> Alertes ON
              </span>
            )}
            {notifPermission === "denied" && (
              <span className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-500">
                <BellOff className="h-3.5 w-3.5" /> Alertes bloquées
              </span>
            )}
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
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700 shrink-0">Live Rankings</h2>
            <div className="flex items-center gap-3 ml-auto">
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                placeholder="Rechercher une équipe..."
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none w-48"
              />
              <span className="text-xs text-gray-400 shrink-0">{visible.length} / {sorted.length}</span>
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">No teams yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="px-4 py-2.5 font-medium">#</th>
                  <th className="px-4 py-2.5 font-medium">Équipe</th>
                  <th className="px-4 py-2.5 font-medium">Étapes</th>
                  <th className="px-4 py-2.5 font-medium">Temps</th>
                  <th className="px-4 py-2.5 font-medium">Statut</th>
                  <th className="px-4 py-2.5 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {visible.map((team, i) => {
                    const ch = parseChar(team.character);
                    const hasStarted = !!team.started_at;
                    const isFinished = team.status === "finished";
                    const el = isFinished && team.completion_time
                      ? team.completion_time
                      : hasStarted ? team.elapsed_seconds + tick * 10 : 0;
                    // Live score: 1000 - 2pts/min - hints penalty (15 per hint as estimate)
                    const liveMinutes = Math.floor(el / 60);
                    const sc = isFinished
                      ? (team.final_score ?? 0)
                      : hasStarted
                      ? Math.max(0, 1000 - liveMinutes * 2 - team.hints_used * 15)
                      : null;
                    const rk = sc !== null ? getRank(sc) : null;
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
                        <td className="px-4 py-3"><div className="flex items-center gap-1 text-gray-500"><Clock className="h-3 w-3" /><span className="font-mono text-xs">{hasStarted ? formatElapsed(el) : "—"}</span></div></td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${team.status === "playing" ? (stuck ? "bg-amber-100 text-amber-700" : "bg-green-50 text-green-700") : team.status === "finished" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{stuck ? "Stuck" : team.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {/* Unlock current step */}
                            <button onClick={() => doUnlockCurrentStep(team.id)}
                              disabled={team.status !== "playing" || !!actionLoading}
                              title="Skip current step"
                              className={`rounded-lg p-1.5 transition ${helpTeamId === team.id ? "bg-red-100 text-red-600 hover:bg-red-200" : "text-gray-400 hover:bg-gray-100 hover:text-indigo-600"} disabled:opacity-30`}>
                              {actionLoading === `unlock-${team.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
                            </button>
                            {/* Message / Chat */}
                            <button onClick={() => openChat(team.id, team.name)}
                              title="Chat with team" className="relative rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600">
                              <MessageSquare className={`h-3.5 w-3.5 ${unreadTeams.has(team.id) ? "text-red-500" : ""}`} />
                              {unreadTeams.has(team.id) && (
                                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-white" />
                              )}
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

      {/* ── Chat Modal ── */}
      {msgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMsgModal(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Chat — {msgModal.teamName}</h3>
              <button onClick={() => setMsgModal(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>

            {/* Chat history */}
            <div ref={chatScrollRef} className="mb-3 max-h-60 overflow-y-auto rounded-lg bg-gray-50 p-3 space-y-2">
              {chatHistory.length === 0 && (
                <p className="text-xs text-gray-400 italic text-center">No messages yet</p>
              )}
              {chatHistory.map((msg) => (
                <div key={msg.id} className={`rounded-lg px-3 py-1.5 text-sm ${
                  msg.type === "player_message" || msg.type === "help_request"
                    ? "bg-indigo-50 text-indigo-700 mr-12"
                    : "bg-white text-gray-700 ml-12 border border-gray-200"
                }`}>
                  <span className="text-[10px] font-medium text-gray-400">
                    {msg.type === "player_message" ? "Player" : msg.type === "help_request" ? "🆘 Help" : "You"}
                  </span>
                  <p>{msg.message}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Reply to the team..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
                autoFocus
              />
              <button
                onClick={sendMessage}
                disabled={!msgText.trim() || msgSending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
