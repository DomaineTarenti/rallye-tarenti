"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Trophy,
  Share2,
  Medal,
  Clock,
  Copy,
  Check,
  FileText,
} from "lucide-react";
import { Loader } from "@/components/shared";
import type { ApiResponse, Session } from "@/lib/types";

// Compatibilité legacy — scoring supprimé dans Rallye Tarenti
function getRank(_score: number) { return { label: "—", color: "#2D7D46", key: "bronze" }; }
type TeamCharacter = Record<string, string>;

interface TeamResult {
  id: string;
  name: string;
  character: string | null;
  status: string;
  final_score: number | null;
  created_at: string;
  completed_steps: number;
  total_steps: number;
  hints_used: number;
  elapsed_seconds: number;
}

function parseCharacter(char: string | null): TeamCharacter | null {
  if (!char) return null;
  try { return JSON.parse(char); } catch { return null; }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const RANK_COLORS = {
  diamond: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  platinum: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  gold: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  silver: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
  bronze: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

export default function ResultsPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);

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
        setTeams(teamsJson.data as TeamResult[]);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Sort by score descending, then by elapsed time ascending
  const sorted = [...teams].sort((a, b) => {
    const scoreA = a.final_score ?? Math.max(0, 1000 - a.hints_used * 15);
    const scoreB = b.final_score ?? Math.max(0, 1000 - b.hints_used * 15);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.elapsed_seconds - b.elapsed_seconds;
  });

  function copyShareLink() {
    const url = `${window.location.origin}/admin/sessions/${sessionId}/results`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader text="Loading results..." />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Trophy className="h-6 w-6 text-amber-500" />
              Final Results
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {session?.name} · {teams.length} teams
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              {linkCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Share2 className="h-3.5 w-3.5" />}
              {linkCopied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>

        {/* Podium (top 3) */}
        {sorted.length >= 3 && (
          <div className="mb-8 flex items-end justify-center gap-4">
            {[sorted[1], sorted[0], sorted[2]].map((team, podiumIdx) => {
              const position = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
              const score = team.final_score ?? Math.max(0, 1000 - team.hints_used * 15);
              const char = parseCharacter(team.character);
              const height = position === 1 ? "h-32" : position === 2 ? "h-24" : "h-20";

              return (
                <div key={team.id} className="flex flex-col items-center">
                  {char && <span className="mb-2 text-2xl">{char.animalEmoji}</span>}
                  <p className="mb-1 text-xs font-medium text-gray-700">{team.name}</p>
                  <p className="mb-2 text-sm font-bold text-amber-600">{score} RP</p>
                  <div className={`${height} w-20 rounded-t-lg ${
                    position === 1 ? "bg-amber-400" : position === 2 ? "bg-gray-300" : "bg-orange-300"
                  } flex items-center justify-center`}>
                    <span className="text-2xl font-bold text-white">{position}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full rankings table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Complete Rankings</h2>
          </div>

          {sorted.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">No teams participated.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sorted.map((team, i) => {
                const score = team.final_score ?? Math.max(0, 1000 - team.hints_used * 15);
                const rank = getRank(score);
                const char = parseCharacter(team.character);
                const colors = rank.key ? (RANK_COLORS as Record<string, unknown>)[rank.key] as typeof RANK_COLORS["diamond"] | null : null;

                return (
                  <div key={team.id} className="flex items-center gap-4 px-5 py-3">
                    {/* Position */}
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      i === 0 ? "bg-amber-100 text-amber-700"
                      : i === 1 ? "bg-gray-200 text-gray-600"
                      : i === 2 ? "bg-orange-100 text-orange-700"
                      : "bg-gray-50 text-gray-400"
                    }`}>
                      {i + 1}
                    </span>

                    {/* Team info */}
                    <div className="flex flex-1 items-center gap-2">
                      {char && (
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                          style={{ backgroundColor: char.color + "25" }}
                        >
                          {char.animalEmoji}
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{team.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {team.completed_steps}/{team.total_steps} chapters · {team.hints_used} hints · {formatDuration(team.elapsed_seconds)}
                        </p>
                      </div>
                    </div>

                    {/* Rank badge */}
                    {colors && rank.key && (
                      <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border}`}>
                        <Medal className="mr-1 inline h-3 w-3" />
                        {rank.label}
                      </span>
                    )}

                    {/* Score */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-600">{score}</p>
                      <p className="text-[10px] text-gray-400">RP</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Certificate generation note */}
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Certificate Generation</p>
          <p className="mt-1 text-xs text-gray-400">
            Coming soon — Personalized certificates for each team based on their rank
          </p>
        </div>
      </div>
    </div>
  );
}
