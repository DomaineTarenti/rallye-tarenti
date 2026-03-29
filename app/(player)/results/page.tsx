"use client";

import { useRouter } from "next/navigation";
import { Trophy, Clock, Hexagon } from "lucide-react";
import { usePlayerStore } from "@/lib/store";
import { getRank, formatDuration } from "@/lib/scoring";

export default function ResultsPage() {
  const router = useRouter();
  const team = usePlayerStore((s) => s.team);
  const session = usePlayerStore((s) => s.session);
  const teamCharacter = usePlayerStore((s) => s.teamCharacter);

  if (!team || !session) {
    router.push("/");
    return null;
  }

  const score = team.final_score ?? 0;
  const rank = getRank(score);
  const teamColor = teamCharacter?.color ?? rank.color;
  const completionTime = (team as unknown as Record<string, unknown>).completion_time as number | null;

  return (
    <main
      className="flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: teamColor }}
    >
      {/* Falling stars */}
      {Array.from({ length: 15 }, (_, i) => (
        <svg
          key={i}
          className="pointer-events-none absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: -30,
            width: 10 + Math.random() * 14,
            height: 10 + Math.random() * 14,
            animation: `particle-fall ${2 + Math.random() * 3}s linear ${Math.random() * 3}s infinite`,
          }}
          viewBox="0 0 24 24"
          fill="white"
          fillOpacity={0.4}
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}

      <div className="relative z-10 flex flex-col items-center px-6 py-12 text-center">
        <Trophy className="mb-4 h-16 w-16 text-white" />

        <h1 className="mb-1 text-2xl font-black text-white">{team.name}</h1>
        <p className="mb-6 text-sm text-white/60">{session.name}</p>

        {/* Rank */}
        <div className="mb-4 rounded-2xl bg-white/20 px-8 py-4 backdrop-blur">
          <p className="text-xs uppercase tracking-wider text-white/60">Rank</p>
          <p className="text-3xl font-black text-white">{team.rank_label ?? rank.label}</p>
        </div>

        {/* Score */}
        <div className="mb-2 text-5xl font-black text-white">{score}</div>
        <p className="mb-6 text-xs text-white/50">points</p>

        {/* Time */}
        {completionTime && (
          <div className="mb-6 flex items-center gap-2 text-white/70">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{formatDuration(completionTime)}</span>
          </div>
        )}

        <p className="text-sm text-white/40">
          Quest complete — thanks for playing!
        </p>
      </div>
    </main>
  );
}
