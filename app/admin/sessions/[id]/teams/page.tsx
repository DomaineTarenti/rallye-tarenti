"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Users, RefreshCw, RotateCcw, Loader2 } from "lucide-react";
import { Loader } from "@/components/shared";
import type { ApiResponse, Session } from "@/lib/types";

interface TeamData {
  id: string;
  name: string;
  access_code: string | null;
  status: string;
  is_precreated: boolean;
  character: string | null;
  object_order: string[];
}

const COLORS = [
  "#7F77DD", "#1D9E75", "#D85A30", "#EF9F27",
  "#378ADD", "#D4537E", "#639922", "#534AB7",
  "#0F6E56", "#993C1D",
];

export default function AdminTeamsPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sessRes, teamsRes] = await Promise.all([
        fetch(`/api/session?all=true`),
        fetch(`/api/teams?session_id=${sessionId}`),
      ]);
      const sessJson: ApiResponse = await sessRes.json();
      const teamsJson: ApiResponse = await teamsRes.json();

      if (sessJson.data) {
        const all = sessJson.data as Session[];
        const found = all.find((s) => s.id === sessionId);
        if (found) setSession(found);
      }
      if (teamsJson.data) {
        setTeams(teamsJson.data as TeamData[]);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function resetTeam(teamId: string, teamName: string) {
    if (!confirm(`Remettre "${teamName}" à zéro ?\n\nCela supprimera toute la progression, les messages et les photos de cette équipe.`)) return;
    setResetting(teamId);
    await fetch("/api/admin/reset-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId }),
    });
    await loadData();
    setResetting(null);
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader text="Loading teams..." /></div>;
  }

  const precreated = teams.filter((t) => t.is_precreated);
  const adhoc = teams.filter((t) => !t.is_precreated);

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
            <p className="text-sm text-gray-500">
              {precreated.length} pre-created · {adhoc.length} ad-hoc
            </p>
          </div>
          <div className="flex gap-2"></div>
        </div>

        {/* Pre-created teams */}
        {precreated.length > 0 && (
          <>
            <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Pre-created Teams</h2>
            <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {precreated.map((team, idx) => {
                const color = COLORS[idx % COLORS.length];
                const statusColor = team.status === "playing" ? "bg-green-100 text-green-700"
                  : team.status === "finished" ? "bg-gray-100 text-gray-500"
                  : "bg-amber-50 text-amber-700";

                return (
                  <div key={team.id} className="rounded-xl border bg-white p-4" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{team.name}</span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor}`}>
                        {team.status}
                      </span>
                    </div>
                    {team.access_code && (
                      <p className="mb-1 font-mono text-2xl font-black tracking-wider" style={{ color }}>
                        {team.access_code}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400">
                        {team.status === "waiting" ? "En attente" : team.status === "playing" ? "En cours" : "Terminé"}
                      </p>
                      {team.status !== "waiting" && (
                        <button
                          onClick={() => resetTeam(team.id, team.name)}
                          disabled={resetting === team.id}
                          title="Remettre à zéro"
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50 disabled:opacity-40 transition"
                        >
                          {resetting === team.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <RotateCcw className="h-3 w-3" />}
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Ad-hoc teams */}
        {adhoc.length > 0 && (
          <>
            <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Ad-hoc Teams</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {adhoc.map((team) => {
                const statusColor = team.status === "playing" ? "bg-green-100 text-green-700"
                  : team.status === "finished" ? "bg-gray-100 text-gray-500"
                  : "bg-amber-50 text-amber-700";

                return (
                  <div key={team.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{team.name}</span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor}`}>
                        {team.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {teams.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">No teams yet. Teams are created when the session is set up with a team count, or when players join.</p>
          </div>
        )}
      </div>
    </div>
  );
}
