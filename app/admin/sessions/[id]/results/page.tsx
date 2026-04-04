"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trophy, Clock, CheckCircle2, Images, Users } from "lucide-react";
import { Loader } from "@/components/shared";
import type { ApiResponse, Session } from "@/lib/types";

interface TeamResult {
  id: string;
  name: string;
  status: string;
  completion_time: number | null;
  completed_steps: number;
  total_steps: number;
  hints_used: number;
  elapsed_seconds: number;
  started_at: string | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [loading, setLoading] = useState(true);

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
      if (teamsJson.data) setTeams(teamsJson.data as TeamResult[]);
    } catch { /* silent */ }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  const finished = teams.filter((t) => t.status === "finished");
  const playing = teams.filter((t) => t.status === "playing");
  const waiting = teams.filter((t) => t.status === "waiting");

  // Triés par temps de complétion croissant
  const sortedFinished = [...finished].sort((a, b) =>
    (a.completion_time ?? 99999) - (b.completion_time ?? 99999)
  );

  const avgTime = finished.length > 0
    ? Math.round(finished.reduce((acc, t) => acc + (t.completion_time ?? 0), 0) / finished.length)
    : null;

  const totalHints = teams.reduce((acc, t) => acc + (t.hints_used ?? 0), 0);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader text="Chargement..." /></div>;
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Trophy className="h-6 w-6 text-amber-500" />
              Résultats
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">{session?.name} · {teams.length} équipes</p>
          </div>
          <button
            onClick={() => router.push(`/admin/sessions/${sessionId}/photos`)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Images className="h-4 w-4" />
            Voir les photos
          </button>
        </div>

        {/* Stats globales */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Users, color: "text-indigo-500", val: teams.length, label: "Équipes total" },
            { icon: CheckCircle2, color: "text-green-500", val: finished.length, label: "Terminées" },
            { icon: Clock, color: "text-amber-500", val: avgTime ? formatDuration(avgTime) : "—", label: "Temps moyen" },
            { icon: Trophy, color: "text-red-400", val: totalHints, label: "Indices utilisés" },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
              <stat.icon className={`mb-1 h-4 w-4 ${stat.color}`} />
              <p className="text-xl font-bold text-gray-900">{stat.val}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Classement équipes terminées */}
        {sortedFinished.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-700">Équipes terminées — classement par temps</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {sortedFinished.map((team, i) => (
                <div key={team.id} className="flex items-center gap-4 px-5 py-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    i === 0 ? "bg-amber-100 text-amber-700"
                    : i === 1 ? "bg-gray-200 text-gray-600"
                    : i === 2 ? "bg-orange-100 text-orange-700"
                    : "bg-gray-50 text-gray-400"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{team.name}</p>
                    <p className="text-xs text-gray-400">
                      {team.completed_steps}/{team.total_steps} étapes
                      {team.hints_used > 0 && ` · ${team.hints_used} indice${team.hints_used > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-green-600">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono text-sm font-bold">
                      {team.completion_time ? formatDuration(team.completion_time) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Équipes en cours */}
        {playing.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-700">En cours ({playing.length})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {[...playing].sort((a, b) => b.completed_steps - a.completed_steps).map((team) => (
                <div key={team.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{team.name}</p>
                  </div>
                  <span className="text-xs text-gray-500">{team.completed_steps}/{team.total_steps} étapes</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Équipes en attente */}
        {waiting.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-dashed border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-400">En attente ({waiting.length})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {waiting.map((team) => (
                <div key={team.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="h-2 w-2 rounded-full bg-gray-300 shrink-0" />
                  <p className="text-sm text-gray-400">{team.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {teams.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm text-gray-400">Aucune équipe pour cette session.</p>
          </div>
        )}
      </div>
    </div>
  );
}
