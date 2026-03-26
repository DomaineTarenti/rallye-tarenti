"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Hexagon, ChevronRight } from "lucide-react";
import { usePlayerStore } from "@/lib/store";
import { getRank } from "@/lib/scoring";

// Generate 20 particles with random positions and durations
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
  const currentStepIndex = usePlayerStore((s) => s.currentStepIndex);
  const currentStep = usePlayerStore((s) => s.currentStep);
  const score = usePlayerStore((s) => s.score);
  const currentStepScore = usePlayerStore((s) => s.currentStepScore);
  const advanceStep = usePlayerStore((s) => s.advanceStep);

  const [showBtn, setShowBtn] = useState(false);
  const particles = useParticles();

  const isLastStep = currentStepIndex + 1 >= steps.length;
  const isStaff = currentStep?.type === "epreuve";
  const teamColor = teamCharacter?.color ?? "#7F77DD";
  const rank = getRank(score);

  // Show continue button after delay
  useEffect(() => {
    const delay = isLastStep ? 5000 : 3000;
    const t = setTimeout(() => setShowBtn(true), delay);
    return () => clearTimeout(t);
  }, [isLastStep]);

  // Auto-redirect after delay (unless last step)
  useEffect(() => {
    if (isLastStep) return;
    const t = setTimeout(() => handleContinue(), 6000);
    return () => clearTimeout(t);
  }, [isLastStep]);

  function handleContinue() {
    if (isLastStep) {
      router.push("/map");
    } else {
      advanceStep();
      router.push("/map");
    }
  }

  if (!team) { router.push("/"); return null; }

  return (
    <main
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: teamColor }}
    >
      {/* ── Falling particles ── */}
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
            // Star for final
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          ) : (
            // Diamond for regular
            <polygon points="12,2 22,12 12,22 2,12" />
          )}
        </svg>
      ))}

      {/* ── Content ── */}
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
          </>
        ) : (
          <>
            <div className="animate-scale-in mb-3 text-7xl">
              {isStaff ? "\u{1F6E1}\u{FE0F}" : "\u{2705}"}
            </div>
            <h1 className="animate-scale-in mb-1 text-3xl font-black text-white">
              {isStaff ? "Challenge Mastered!" : "Well Done!"}
            </h1>
            <p className="mb-5 text-sm text-white/60">
              Chapter {currentStepIndex + 1} of {steps.length}
            </p>
            <div className="animate-score-pop rounded-xl bg-white/20 px-8 py-4 backdrop-blur">
              <span className="text-4xl font-black text-white">+{currentStepScore} RP</span>
            </div>
          </>
        )}

        {showBtn && (
          <button
            onClick={handleContinue}
            className="mt-8 flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold shadow-lg transition active:scale-95"
            style={{ color: teamColor }}
          >
            {isLastStep ? "View your journey" : "Continue"}
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </main>
  );
}
