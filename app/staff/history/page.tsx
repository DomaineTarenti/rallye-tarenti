"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import { useStaffStore } from "@/lib/staffStore";
import { supabase } from "@/lib/supabase";
import type { TeamCharacter } from "@/lib/types";

interface HistoryEntry {
  id: string;
  team_name: string;
  character: TeamCharacter | null;
  completed_at: string | null;
  epreuve_success: boolean | null;
}

function parseChar(c: string | null): TeamCharacter | null {
  if (!c) return null;
  try { return JSON.parse(c); } catch { return null; }
}

export default function StaffHistoryPage() {
  const router = useRouter();
  const staffId = useStaffStore((s) => s.staffId);
  const assignedStepId = useStaffStore((s) => s.assignedStepId);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !assignedStepId) return;

    async function load() {
      const { data: progress } = await supabase
        .from("team_progress")
        .select("id, team_id, completed_at, epreuve_success")
        .eq("step_id", assignedStepId!)
        .in("status", ["completed", "active"])
        .order("completed_at", { ascending: false });

      if (!progress || progress.length === 0) return;

      const teamIds = progress.map((p) => p.team_id);
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, character")
        .in("id", teamIds);

      const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));

      setEntries(
        progress
          .filter((p) => p.completed_at)
          .map((p) => {
            const team = teamMap.get(p.team_id);
            return {
              id: p.id,
              team_name: team?.name ?? "Unknown",
              character: parseChar(team?.character ?? null),
              completed_at: p.completed_at,
              epreuve_success: p.epreuve_success,
            };
          })
      );
    }
    load();
  }, [mounted, assignedStepId]);

  if (!mounted) return null;
  if (!staffId) { router.replace("/staff/login"); return null; }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep text-white">
      <div className="border-b border-white/5 px-4 py-3">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div className="flex-1 px-4 py-6">
        <h1 className="mb-6 text-xl font-bold">Validation History</h1>

        {entries.length === 0 ? (
          <p className="text-center text-sm text-gray-500">No teams validated yet.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-surface p-4">
                {e.character && (
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg text-lg" style={{ backgroundColor: (e.character.color ?? "#7F77DD") + "25" }}>
                    {e.character.animalEmoji}
                  </span>
                )}
                <div className="flex-1">
                  <p className="font-medium">{e.team_name}</p>
                  <p className="text-xs text-gray-500">
                    {e.completed_at ? new Date(e.completed_at).toLocaleTimeString() : "—"}
                  </p>
                </div>
                {e.epreuve_success === true ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : e.epreuve_success === false ? (
                  <XCircle className="h-5 w-5 text-red-400" />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
