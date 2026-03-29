"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Hexagon, ChevronRight } from "lucide-react";
import { usePlayerStore } from "@/lib/store";
import { getRank } from "@/lib/scoring";
import type { ApiResponse } from "@/lib/types";

function useParticles() {
  return useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 2,
      size: 12 + Math.random() * 16,
    })), []
  );
}

export default function CelebratePage() {
  const router = useRouter();
  const team = usePlayerStore((s) => s.team);
  const teamCharacter = usePlayerStore((s) => s.teamCharacter);
  const steps = usePlayerStore((s) => s.steps);
  const objects = usePlayerStore((s) => s.objects);
  const currentStep = usePlayerStore((s) => s.currentStep);
  const progress = usePlayerStore((s) => s.progress);
  const score = usePlayerStore((s) => s.score);
  const currentStepScore = usePlayerStore((s) => s.currentStepScore);
  const advanceStep = usePlayerStore((s) => s.advanceStep);
  const addCollectedLetter = usePlayerStore((s) => s.addCollectedLetter);
  const setTeam = usePlayerStore((s) => s.setTeam);

  const [showBtn, setShowBtn] = useState(false);
  const [phase, setPhase] = useState<"score" | "letter">("score");
  const [collecting, setCollecting] = useState(false);
  const particles = useParticles();

  // The chapter we just completed = completedCount (if store is fresh) or at least currentStepIndex + 1
  const completedCount = progress.filter((p) => p.status === "completed").length;
  const currentStepIndex = usePlayerStore((s) => s.currentStepIndex);
  const chapterNumber = Math.max(completedCount, currentStepIndex + 1);
  const totalChapters = team?.object_order?.length ?? steps.length;
  const isLastStep = chapterNumber >= totalChapters;
  const isStaff = currentStep?.type === "epreuve";
  const teamColor = teamCharacter?.color ?? "#7F77DD";
  const rank = getRank(score);

  // Find the hidden letter for the current object
  const currentObject = currentStep ? objects.find((o) => o.id === currentStep.object_id) : null;
  const hiddenLetter = currentObject?.hidden_letter ?? null;

  // Show continue button after delay
  useEffect(() => {
    const delay = isLastStep ? 5000 : 3000;
    const t = setTimeout(() => setShowBtn(true), delay);
    return () => clearTimeout(t);
  }, [isLastStep]);

  // Auto-transition to letter phase after 2s (non-final steps only)
  useEffect(() => {
    if (isLastStep || !hiddenLetter) return;
    const t = setTimeout(() => setPhase("letter"), 2000);
    return () => clearTimeout(t);
  }, [isLastStep, hiddenLetter]);

  async function collectAndContinue() {
    if (collecting) return;
    setCollecting(true);

    // Save letter to backend
    if (team && currentObject?.physical_id && hiddenLetter) {
      try {
        const newLetters = { ...(team.collected_letters ?? {}), [currentObject.physical_id]: hiddenLetter };
        const res = await fetch("/api/team/letters", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team_id: team.id, collected_letters: newLetters }),
        });
        const json: ApiResponse = await res.json();
        if (!json.error) {
          addCollectedLetter(currentObject.physical_id, hiddenLetter);
          setTeam({ ...team, collected_letters: newLetters });
        }
      } catch { /* continue anyway */ }
    }

    handleContinue();
  }

  function handleContinue() {
    if (isLastStep) {
      router.push("/unlock");
    } else {
      advanceStep(); // advances index, clears currentStep
      router.push("/navigate"); // go find the next object
    }
  }

  if (!team) { router.push("/"); return null; }

  return (
    <main
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: teamColor }}
    >
      {/* Falling particles */}
      {particles.map((p) => (
        <svg
          key={p.id}
          className="pointer-events-none absolute"
          style={{
            left: p.left,
            top: -30,
            width: p.size,
            height: p.size,
            animation: `particle-fall ${p.duration}s linear ${p.delay}s infinite`,
          }}
          viewBox="0 0 24 24"
          fill="white"
          fillOpacity={0.6}
        >
          {isLastStep ? (
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          ) : (
            <polygon points="12,2 22,12 12,22 2,12" />
          )}
        </svg>
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {isLastStep ? (
          <>
            <div className="animate-scale-in mb-4">
              <Trophy className="h-20 w-20 text-white" />
            </div>
            <h1 className="animate-scale-in mb-2 text-3xl font-black text-white">
              The Treasure is Revealed!
            </h1>
            <p className="mb-6 text-white/70">
              You have completed every chapter of the quest
            </p>
            {rank.key && (
              <div className="animate-score-pop mb-4 rounded-2xl bg-white/20 px-8 py-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wider text-white/70">Final Rank</p>
                <p className="text-4xl font-black text-white">{rank.label}</p>
              </div>
            )}
            <div className="animate-score-pop flex items-center gap-2">
              <Hexagon className="h-6 w-6 text-white" />
              <span className="text-3xl font-black text-white">{score} RP</span>
            </div>
            {showBtn && (
              <button
                onClick={handleContinue}
                className="mt-8 flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold shadow-lg transition active:scale-95"
                style={{ color: teamColor }}
              >
                Unlock the Treasure
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </>
        ) : phase === "score" ? (
          <>
            <div className="animate-scale-in mb-3 text-7xl">
              {isStaff ? "\u{1F6E1}\u{FE0F}" : "\u{2705}"}
            </div>
            <h1 className="animate-scale-in mb-1 text-3xl font-black text-white">
              {isStaff ? "Challenge Mastered!" : "Well Done!"}
            </h1>
            <p className="mb-5 text-sm text-white/60">
              Chapter {chapterNumber} of {totalChapters}
            </p>
            <div className="animate-score-pop rounded-xl bg-white/20 px-8 py-4 backdrop-blur">
              <span className="text-2xl font-black text-white">Chapter {chapterNumber} complete</span>
            </div>
          </>
        ) : (
          /* Letter reveal phase */
          <>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/70">
              New Clue
            </p>
            <div className="animate-scale-in mb-6 flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/20 backdrop-blur">
              <span className="font-serif text-7xl font-black text-white" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
                {hiddenLetter}
              </span>
            </div>
            <p className="mb-6 text-sm text-white/60">
              Remember this letter... it will unlock the final treasure.
            </p>
            <button
              onClick={collectAndContinue}
              disabled={collecting}
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold shadow-lg transition active:scale-95 disabled:opacity-50"
              style={{ color: teamColor }}
            >
              {collecting ? "Collecting..." : "Collect & Continue"}
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </main>
  );
}
