"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Lock, Trophy, Hexagon, RotateCcw, Clock, Lightbulb } from "lucide-react";
import { Button } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import { getRank, formatDuration } from "@/lib/scoring";
import type { ApiResponse } from "@/lib/types";

interface UnlockResult {
  success: boolean;
  message?: string;
  final_score?: number;
  rank?: string;
  rank_label?: string;
  completion_time?: number;
  time_penalty?: number;
  hint_penalty?: number;
  hints_count?: number;
  position?: number;
  total_finished?: number;
}

export default function UnlockPage() {
  const router = useRouter();
  const team = usePlayerStore((s) => s.team);
  const teamCharacter = usePlayerStore((s) => s.teamCharacter);
  const objects = usePlayerStore((s) => s.objects);
  const collectedLetters = usePlayerStore((s) => s.collectedLetters);
  const score = usePlayerStore((s) => s.score);
  const setScore = usePlayerStore((s) => s.setScore);

  const teamColor = teamCharacter?.color ?? "#7F77DD";

  // 9 slots for the answer
  const [slots, setSlots] = useState<(string | null)[]>(Array(9).fill(null));
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [solved, setSolved] = useState(false);
  const [finalResult, setFinalResult] = useState<UnlockResult | null>(null);

  // Available letters from collected objects
  const availableLetters = useMemo(() => {
    const letters: { id: string; letter: string }[] = [];
    for (const obj of objects) {
      if (obj.physical_id && obj.hidden_letter) {
        const collected = collectedLetters[obj.physical_id];
        if (collected) {
          letters.push({ id: obj.physical_id, letter: collected });
        }
      }
    }
    return letters;
  }, [objects, collectedLetters]);

  // Track which letters are placed in slots
  const usedIds = slots.filter(Boolean) as string[];

  function placeLetter(physicalId: string, letter: string) {
    // Find first empty slot
    const emptyIdx = slots.indexOf(null);
    if (emptyIdx === -1) return;
    if (usedIds.includes(physicalId)) return;

    const next = [...slots];
    next[emptyIdx] = physicalId;
    setSlots(next);
    setFeedback(null);
  }

  function removeSlot(idx: number) {
    const next = [...slots];
    next[idx] = null;
    setSlots(next);
    setFeedback(null);
  }

  function clearSlots() {
    setSlots(Array(9).fill(null));
    setFeedback(null);
  }

  // Build the word from placed letters
  const currentWord = slots.map((physId) => {
    if (!physId) return "";
    return collectedLetters[physId] ?? "";
  }).join("");

  async function handleSubmit() {
    if (currentWord.length !== 9 || submitting || attemptsLeft <= 0) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: team!.id, word_attempt: currentWord }),
      });
      const json: ApiResponse = await res.json();
      const data = json.data as UnlockResult | null;

      if (data?.success) {
        setFinalResult(data);
        setSolved(true);
      } else {
        setAttemptsLeft((a) => a - 1);
        setFeedback(`${data?.message ?? "Incorrect."} (${attemptsLeft - 1} attempts left)`);
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
      }
    } catch {
      setFeedback("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!team) { router.push("/"); return null; }

  // Victory screen
  if (solved && finalResult) {
    const rank = getRank(finalResult.final_score ?? 0);
    return (
      <main
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden overflow-y-auto"
        style={{ backgroundColor: teamColor }}
      >
        {/* Falling stars */}
        {Array.from({ length: 20 }, (_, i) => (
          <svg
            key={i}
            className="pointer-events-none absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: -30,
              width: 12 + Math.random() * 16,
              height: 12 + Math.random() * 16,
              animation: `particle-fall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s infinite`,
            }}
            viewBox="0 0 24 24"
            fill="white"
            fillOpacity={0.6}
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        ))}

        <div className="relative z-10 flex flex-col items-center px-6 py-12 text-center">
          <div className="animate-scale-in mb-4">
            <Trophy className="h-20 w-20 text-white" />
          </div>
          <h1 className="animate-scale-in mb-2 text-3xl font-black text-white">
            The Labyrinth is Solved!
          </h1>
          <p className="mb-4 text-white/70">
            {team.name} — you have unlocked the treasure
          </p>

          {/* The word */}
          <div className="animate-score-pop mb-4 flex gap-1.5">
            {currentWord.split("").map((l, i) => (
              <div key={i} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/30 text-xl font-black text-white backdrop-blur">
                {l}
              </div>
            ))}
          </div>

          {/* Rank */}
          <div className="animate-score-pop mb-4 rounded-2xl bg-white/20 px-8 py-4 backdrop-blur">
            <p className="text-xs uppercase tracking-wider text-white/70">Final Rank</p>
            <p className="text-3xl font-black text-white">{rank.label}</p>
          </div>

          {/* Score */}
          <div className="animate-score-pop mb-4 text-5xl font-black text-white">
            {finalResult.final_score}
          </div>
          <p className="mb-6 text-xs text-white/50">points</p>

          {/* Score breakdown */}
          <div className="mb-6 w-full max-w-xs space-y-2 rounded-xl bg-white/10 p-4 text-left text-sm backdrop-blur">
            <div className="flex justify-between text-white/80">
              <span>Base score</span>
              <span className="font-bold">1000</span>
            </div>
            {(finalResult.time_penalty ?? 0) > 0 && (
              <div className="flex items-center justify-between text-white/60">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Time ({finalResult.completion_time ? formatDuration(finalResult.completion_time) : ""})</span>
                <span className="text-red-300">-{finalResult.time_penalty}</span>
              </div>
            )}
            {(finalResult.hint_penalty ?? 0) > 0 && (
              <div className="flex items-center justify-between text-white/60">
                <span className="flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Hints ({finalResult.hints_count})</span>
                <span className="text-red-300">-{finalResult.hint_penalty}</span>
              </div>
            )}
            <div className="border-t border-white/20 pt-2 flex justify-between font-bold text-white">
              <span>Final score</span>
              <span>{finalResult.final_score}</span>
            </div>
          </div>

          {/* Position / Leaderboard */}
          {finalResult.position && (
            <div className="mb-6 w-full max-w-xs rounded-xl bg-white/10 p-4 text-center backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-white/50">Leaderboard</p>
              <p className="mt-1 text-4xl font-black text-white">
                {finalResult.position === 1 ? "&#x1F947;" : finalResult.position === 2 ? "&#x1F948;" : finalResult.position === 3 ? "&#x1F949;" : `#${finalResult.position}`}
              </p>
              <p className="mt-1 text-sm text-white/60">
                {finalResult.position === 1
                  ? "You are the champions!"
                  : `${finalResult.position}${finalResult.position === 2 ? "nd" : finalResult.position === 3 ? "rd" : "th"} out of ${finalResult.total_finished} team${(finalResult.total_finished ?? 0) > 1 ? "s" : ""}`}
              </p>
            </div>
          )}

          <button
            onClick={() => router.push("/map")}
            className="rounded-xl bg-white px-6 py-3 font-bold shadow-lg transition active:scale-95"
            style={{ color: teamColor }}
          >
            View your journey
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-4 text-center">
        <Lock className="mx-auto mb-1 h-8 w-8 text-amber" />
        <h1 className="text-xl font-bold">The Final Treasure</h1>
        <p className="text-xs text-gray-500">Arrange the letters to form the secret word</p>
      </div>

      <div className="flex flex-1 flex-col items-center px-4 pt-6">
        {/* Answer slots */}
        <div className={`mb-6 flex gap-2 ${shaking ? "animate-shake" : ""}`}>
          {slots.map((physId, idx) => {
            const letter = physId ? (collectedLetters[physId] ?? "") : "";
            return (
              <button
                key={idx}
                onClick={() => physId && removeSlot(idx)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-xl font-black transition ${
                  physId
                    ? "border-white/30 bg-white/15 text-white"
                    : "border-white/10 bg-white/5 text-white/20"
                }`}
              >
                {letter || (idx + 1)}
              </button>
            );
          })}
        </div>

        {/* Available letters */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Your collected letters
        </p>
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {availableLetters.map(({ id, letter }) => {
            const isUsed = usedIds.includes(id);
            return (
              <button
                key={id}
                onClick={() => !isUsed && placeLetter(id, letter)}
                disabled={isUsed}
                className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 font-serif text-2xl font-black transition ${
                  isUsed
                    ? "border-white/5 bg-white/5 text-white/20"
                    : "border-amber/40 bg-amber/10 text-amber hover:bg-amber/20"
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Score + attempts */}
        <div className="mb-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-amber">
            <Hexagon className="h-4 w-4" />
            <span className="font-bold">{score} RP</span>
          </div>
          <span className="text-gray-500">
            {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} left
          </span>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-400">
            {feedback}
          </div>
        )}

        {/* Actions */}
        <div className="flex w-full max-w-xs gap-2">
          <button
            onClick={clearSlots}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-gray-400 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <Button
            onClick={handleSubmit}
            disabled={currentWord.length !== 9 || submitting || attemptsLeft <= 0}
            size="lg"
            className="flex-1"
          >
            {submitting ? "Checking..." : attemptsLeft <= 0 ? "No attempts left" : "Open the Treasure"}
          </Button>
        </div>
      </div>
    </main>
  );
}
