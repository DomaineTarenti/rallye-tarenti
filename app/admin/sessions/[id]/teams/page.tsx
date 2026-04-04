"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Users, RotateCcw, Loader2, Printer, QrCode } from "lucide-react";
import QRCode from "react-qr-code";
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
  "#2D7D46", "#1D9E75", "#D85A30", "#EF9F27",
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
  const [showQR, setShowQR] = useState(false);

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
      if (teamsJson.data) setTeams(teamsJson.data as TeamData[]);
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

  function printQRCodes() {
    window.print();
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader text="Chargement..." /></div>;
  }

  const precreated = teams.filter((t) => t.is_precreated);
  const adhoc = teams.filter((t) => !t.is_precreated);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="p-6 lg:p-8">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #qr-print-area, #qr-print-area * { visibility: visible !important; }
          #qr-print-area { position: fixed; inset: 0; background: white; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Équipes</h1>
            <p className="text-sm text-gray-500">
              {session?.name} · {precreated.length} équipes · {teams.filter(t => t.status === "playing").length} en jeu · {teams.filter(t => t.status === "finished").length} terminées
            </p>
          </div>
          <div className="flex gap-2 no-print">
            <button
              onClick={() => setShowQR(!showQR)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${showQR ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <QrCode className="h-4 w-4" />
              Codes QR
            </button>
            {showQR && (
              <button
                onClick={printQRCodes}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </button>
            )}
          </div>
        </div>

        {/* ── Vue QR codes ── */}
        {showQR && (
          <div id="qr-print-area" className="mb-8">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              {precreated.map((team, idx) => {
                if (!team.access_code) return null;
                const color = COLORS[idx % COLORS.length];
                const url = `${baseUrl}/?team=${team.access_code}`;
                return (
                  <div key={team.id} className="flex flex-col items-center rounded-xl border-2 bg-white p-3 gap-2" style={{ borderColor: color }}>
                    <p className="font-mono text-xs font-black tracking-widest" style={{ color }}>{team.access_code}</p>
                    <div className="p-1.5 bg-white rounded-lg">
                      <QRCode value={url} size={88} fgColor={color} bgColor="#ffffff" />
                    </div>
                    <p className="text-[10px] text-gray-400 text-center leading-tight">
                      Scanner pour<br />rejoindre
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-gray-400 text-center no-print">
              Cliquez sur "Imprimer" pour imprimer toutes les cartes QR.
            </p>
          </div>
        )}

        {/* ── Liste équipes ── */}
        {precreated.length > 0 && (
          <>
            <h2 className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider no-print">Équipes pré-créées</h2>
            <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 no-print">
              {precreated.map((team, idx) => {
                const color = COLORS[idx % COLORS.length];
                const statusColor = team.status === "playing" ? "bg-green-100 text-green-700"
                  : team.status === "finished" ? "bg-blue-50 text-blue-600"
                  : "bg-amber-50 text-amber-700";
                const statusLabel = team.status === "playing" ? "En jeu"
                  : team.status === "finished" ? "Terminé" : "En attente";

                return (
                  <div key={team.id} className="rounded-xl border bg-white p-4" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{team.name}</span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    {team.access_code && (
                      <p className="mb-2 font-mono text-xl font-black tracking-widest" style={{ color }}>
                        {team.access_code}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {team.status === "waiting" ? "Pas encore commencé" : ""}
                      </span>
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

        {adhoc.length > 0 && (
          <>
            <h2 className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider no-print">Équipes ad-hoc</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 no-print">
              {adhoc.map((team) => (
                <div key={team.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">{team.name}</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                      team.status === "playing" ? "bg-green-100 text-green-700"
                      : team.status === "finished" ? "bg-blue-50 text-blue-600"
                      : "bg-amber-50 text-amber-700"
                    }`}>
                      {team.status === "playing" ? "En jeu" : team.status === "finished" ? "Terminé" : "En attente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {teams.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center no-print">
            <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">Aucune équipe pour cette session.</p>
          </div>
        )}
      </div>
    </div>
  );
}
