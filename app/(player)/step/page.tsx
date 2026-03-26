"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Scroll, ChevronRight, Send, ShieldCheck, Sparkles, Hexagon, Trophy,
} from "lucide-react";
import { Button, Card, Loader, BottomNav } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { calculateScore, getRank } from "@/lib/scoring";
import type { ApiResponse, AnswerResult, Step, TeamProgress } from "@/lib/types";

function getEnigmaInputType(step: Step): "text" | "code" | "qcm" | "staff" {
  if (step.type === "epreuve") return "staff";
  if (!step.enigme) return "text";
  if (step.enigme.includes("|")) return "qcm";
  if (step.answer && /^\d+$/.test(step.answer)) return "code";
  return "text";
}

function parseQCMChoices(enigme: string) {
  const parts = enigme.split("|").map((s) => s.trim());
  return { question: parts[0], choices: parts.slice(1) };
}

const QCM_LETTERS = ["A", "B", "C", "D", "E", "F"];

// Star positions for celebration
const STARS = [
  { left: "5%", cls: "animate-star-1" },
  { left: "15%", cls: "animate-star-2" },
  { left: "28%", cls: "animate-star-3" },
  { left: "42%", cls: "animate-star-4" },
  { left: "55%", cls: "animate-star-5" },
  { left: "68%", cls: "animate-star-6" },
  { left: "80%", cls: "animate-star-7" },
  { left: "92%", cls: "animate-star-8" },
];

export default function StepPage() {
  const router = useRouter();
  const team = usePlayerStore((s) => s.team);
  const teamCharacter = usePlayerStore((s) => s.teamCharacter);
  const currentStep = usePlayerStore((s) => s.currentStep);
  const steps = usePlayerStore((s) => s.steps);
  const currentStepIndex = usePlayerStore((s) => s.currentStepIndex);
  const score = usePlayerStore((s) => s.score);
  const progress = usePlayerStore((s) => s.progress);
  const setCurrentStepIndex = usePlayerStore((s) => s.setCurrentStepIndex);
  const setCurrentStep = usePlayerStore((s) => s.setCurrentStep);
  const setScore = usePlayerStore((s) => s.setScore);
  const setProgress = usePlayerStore((s) => s.setProgress);

  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [waitingStaff, setWaitingStaff] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const isLastStep = currentStepIndex + 1 >= steps.length;
  const teamColor = teamCharacter?.color ?? "#7F77DD";

  useEffect(() => {
    if (hydrated && currentStep) {
      const timer = setTimeout(() => setRevealed(true), 600);
      return () => clearTimeout(timer);
    }
  }, [hydrated, currentStep]);

  // Supabase Realtime for staff validation
  useEffect(() => {
    if (!waitingStaff || !team || !currentStep) return;
    const channel = supabase
      .channel(`progress-${team.id}-${currentStep.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "team_progress", filter: `team_id=eq.${team.id}` },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          if (updated.step_id === currentStep.id && updated.status === "completed") {
            setWaitingStaff(false);
            triggerCelebration();
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [waitingStaff, team, currentStep]);

  function triggerCelebration() {
    setValidated(true);
    setCelebrating(true);
    const updatedProgress = progress.map((p) =>
      p.step_id === currentStep!.id ? { ...p, status: "completed" as const, completed_at: new Date().toISOString() } : p
    );
    setProgress(updatedProgress);
    setScore(calculateScore(null, updatedProgress as TeamProgress[]));

    // Show continue button after delay
    const delay = isLastStep ? 5000 : 2500;
    setTimeout(() => setShowContinue(true), delay);
  }

  const handleNextStep = useCallback(() => {
    if (isLastStep) {
      router.push("/play"); // Will show quest complete
      return;
    }
    const nextIdx = currentStepIndex + 1;
    setCurrentStepIndex(nextIdx);
    setCurrentStep(steps[nextIdx]);
    router.push("/play");
  }, [currentStepIndex, steps, isLastStep, setCurrentStepIndex, setCurrentStep, router]);

  if (!hydrated) return null;
  if (!team || !currentStep) { router.push("/play"); return null; }

  const step = currentStep;
  const enigmaType = getEnigmaInputType(step);

  async function handleSubmitAnswer() {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: team!.id, step_id: step.id, answer: answer.trim() }),
      });
      const json: ApiResponse<AnswerResult> = await res.json();
      const result = json.data;

      if (result?.correct) {
        triggerCelebration();
      } else {
        setError(result?.message ?? "Incorrect. Try again!");
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
      }
    } catch {
      setError("Connection error.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Celebration screen ──
  if (celebrating) {
    const rank = getRank(score);
    const isStaff = step.type === "epreuve";

    return (
      <main className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: teamColor }}>
        {/* Falling stars */}
        {STARS.map((star, i) => (
          <div
            key={i}
            className={`pointer-events-none absolute text-2xl ${star.cls}`}
            style={{ left: star.left, top: 0 }}
          >
            {isLastStep ? "\u{2B50}" : "\u{2728}"}
          </div>
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          {isLastStep ? (
            <>
              {/* Final step — treasure revealed */}
              <div className="animate-scale-in mb-4">
                <Trophy className="h-20 w-20 text-white" />
              </div>
              <h1 className="animate-scale-in mb-2 text-3xl font-black text-white">
                The Treasure is Revealed!
              </h1>
              <p className="mb-6 text-white/70">
                You have completed every chapter of the quest
              </p>

              {/* Final rank */}
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
              {/* Regular step celebration */}
              <div className="animate-scale-in mb-3 text-6xl">
                {isStaff ? "\u{1F6E1}\u{FE0F}" : "\u{2705}"}
              </div>
              <h1 className="animate-scale-in mb-1 text-2xl font-black text-white">
                {isStaff ? "Challenge Mastered!" : "Well Done!"}
              </h1>
              <p className="mb-4 text-sm text-white/60">
                Chapter {currentStepIndex + 1} of {steps.length} completed
              </p>

              {/* Score popup */}
              <div className="animate-score-pop flex items-center gap-2 rounded-xl bg-white/20 px-6 py-3 backdrop-blur">
                <span className="text-3xl font-black text-white">+30 RP</span>
              </div>
            </>
          )}

          {/* Continue button */}
          {showContinue && (
            <button
              onClick={handleNextStep}
              className="mt-8 flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold transition hover:bg-white/90"
              style={{ color: teamColor }}
            >
              {isLastStep ? "View Results" : "Continue"}
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </main>
    );
  }

  // ── Revelation + Validation ──
  return (
    <main className="flex min-h-[100dvh] flex-col px-6 pb-20 pt-8">
      <div className="mb-6 text-center">
        <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
          Chapter {currentStepIndex + 1} of {steps.length}
        </span>
      </div>

      <div className={`transition-all duration-700 ${revealed ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
        <Card className="mb-6 bg-surface">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <Scroll className="h-5 w-5" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">New Discovery</span>
          </div>
          <p className="leading-relaxed text-gray-200">
            {step.text_narratif || "You have uncovered a new clue! Examine it carefully."}
          </p>
        </Card>
      </div>

      <div className={`transition-all delay-300 duration-700 ${revealed ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
        {(enigmaType === "text" || enigmaType === "code") && (
          <Card className={`bg-surface ${shaking ? "animate-shake" : ""}`}>
            <p className="mb-4 font-medium text-white">{step.enigme ?? "What is your answer?"}</p>
            <div className="flex gap-2">
              <input
                type={enigmaType === "code" ? "number" : "text"}
                inputMode={enigmaType === "code" ? "numeric" : "text"}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={enigmaType === "code" ? "0000" : "Your answer..."}
                className={`flex-1 rounded-xl border border-white/10 bg-deep px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${enigmaType === "code" ? "text-center font-mono text-xl tracking-[0.3em]" : ""}`}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()}
              />
              <Button onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting} className="px-4">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </Card>
        )}

        {enigmaType === "qcm" && (() => {
          const { question, choices } = parseQCMChoices(step.enigme!);
          return (
            <Card className={`bg-surface ${shaking ? "animate-shake" : ""}`}>
              <p className="mb-4 font-medium text-white">{question}</p>
              <div className="space-y-2">
                {choices.map((choice, i) => (
                  <button key={i} onClick={() => setAnswer(choice)} disabled={submitting}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${answer === choice ? "border-primary bg-primary/15 text-white" : "border-white/10 bg-deep text-gray-300 hover:border-white/20"}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${answer === choice ? "bg-primary text-white" : "bg-white/5 text-gray-500"}`}>{QCM_LETTERS[i]}</span>
                    {choice}
                  </button>
                ))}
              </div>
              {answer && <Button onClick={handleSubmitAnswer} disabled={submitting} className="mt-3 w-full">Submit</Button>}
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            </Card>
          );
        })()}

        {enigmaType === "staff" && (
          <Card className="bg-surface text-center">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-primary" />
            {waitingStaff ? (
              <>
                <h3 className="mb-2 font-bold">The Guardian is evaluating...</h3>
                <p className="mb-4 text-sm text-gray-400">Awaiting validation</p>
                <div className="animate-guardian-pulse mx-auto h-12 w-12 rounded-full bg-primary/20" />
                <Loader text="" />
              </>
            ) : (
              <>
                <h3 className="mb-2 font-bold">Guardian Challenge</h3>
                <p className="mb-4 text-sm text-gray-400">{step.enigme ?? "Find the nearest Guardian."}</p>
                <Button onClick={() => setWaitingStaff(true)} className="w-full">I found the Guardian</Button>
              </>
            )}
          </Card>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
