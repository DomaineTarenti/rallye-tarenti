"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Scroll,
  ChevronRight,
  Send,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Hexagon,
} from "lucide-react";
import { Button, Card, Loader, BottomNav } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { calculateScore } from "@/lib/scoring";
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

export default function StepPage() {
  const router = useRouter();
  const team = usePlayerStore((s) => s.team);
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
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [waitingStaff, setWaitingStaff] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Reveal animation
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "team_progress",
          filter: `team_id=eq.${team.id}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          if (updated.step_id === currentStep.id && updated.status === "completed") {
            setWaitingStaff(false);
            setValidated(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [waitingStaff, team, currentStep]);

  const handleNextStep = useCallback(() => {
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < steps.length) {
      setCurrentStepIndex(nextIdx);
      setCurrentStep(steps[nextIdx]);
    }
    router.push("/play");
  }, [currentStepIndex, steps, setCurrentStepIndex, setCurrentStep, router]);

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
        setValidated(true);
        const updatedProgress = progress.map((p) =>
          p.step_id === step.id
            ? { ...p, status: "completed" as const, completed_at: new Date().toISOString() }
            : p
        );
        setProgress(updatedProgress);
        setScore(calculateScore(null, updatedProgress as TeamProgress[]));
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

  // ── Success screen ──
  if (validated) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-20">
        <div className="mb-6 animate-bounce">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle2 className="h-14 w-14 text-green-400" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-green-400">Well Done!</h1>
        <p className="mb-2 text-gray-400">Chapter validated</p>

        <Card className="mb-8 w-full max-w-xs bg-surface text-center">
          <div className="flex items-center justify-center gap-2">
            <Hexagon className="h-5 w-5 text-amber" />
            <span className="text-2xl font-bold text-amber">{score} RP</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Chapter {currentStepIndex + 1} of {steps.length}
          </p>
        </Card>

        <Button onClick={handleNextStep} size="lg" className="w-full max-w-xs">
          {currentStepIndex + 1 < steps.length ? (
            <>Continue the Journey <ChevronRight className="ml-1 inline h-5 w-5" /></>
          ) : (
            <>View Results <Sparkles className="ml-1 inline h-5 w-5" /></>
          )}
        </Button>

        <BottomNav />
      </main>
    );
  }

  // ── Revelation + Validation ──
  return (
    <main className="flex min-h-[100dvh] flex-col px-6 pb-20 pt-8">
      {/* Chapter indicator */}
      <div className="mb-6 text-center">
        <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
          Chapter {currentStepIndex + 1} of {steps.length}
        </span>
      </div>

      {/* Narrative reveal */}
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

      {/* Validation section */}
      <div className={`transition-all delay-300 duration-700 ${revealed ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
        {/* Text or code input */}
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
                className={`flex-1 rounded-xl border border-white/10 bg-deep px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                  enigmaType === "code" ? "text-center font-mono text-xl tracking-[0.3em]" : ""
                }`}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()}
              />
              <Button onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting} className="px-4">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </Card>
        )}

        {/* QCM */}
        {enigmaType === "qcm" && (() => {
          const { question, choices } = parseQCMChoices(step.enigme!);
          return (
            <Card className={`bg-surface ${shaking ? "animate-shake" : ""}`}>
              <p className="mb-4 font-medium text-white">{question}</p>
              <div className="space-y-2">
                {choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswer(choice)}
                    disabled={submitting}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                      answer === choice
                        ? "border-primary bg-primary/15 text-white"
                        : "border-white/10 bg-deep text-gray-300 hover:border-white/20"
                    }`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      answer === choice ? "bg-primary text-white" : "bg-white/5 text-gray-500"
                    }`}>
                      {QCM_LETTERS[i]}
                    </span>
                    {choice}
                  </button>
                ))}
              </div>
              {answer && (
                <Button onClick={handleSubmitAnswer} disabled={submitting} className="mt-3 w-full">Submit</Button>
              )}
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            </Card>
          );
        })()}

        {/* Staff validation */}
        {enigmaType === "staff" && (
          <Card className="bg-surface text-center">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-primary" />
            {waitingStaff ? (
              <>
                <h3 className="mb-2 font-bold">The Guardian is evaluating...</h3>
                <p className="mb-4 text-sm text-gray-400">Awaiting validation from a Guardian</p>
                <div className="animate-guardian-pulse mx-auto h-12 w-12 rounded-full bg-primary/20" />
                <Loader text="" />
              </>
            ) : (
              <>
                <h3 className="mb-2 font-bold">Guardian Challenge</h3>
                <p className="mb-4 text-sm text-gray-400">
                  {step.enigme ?? "Find the nearest Guardian and complete their challenge."}
                </p>
                <Button onClick={() => setWaitingStaff(true)} className="w-full">
                  I found the Guardian
                </Button>
              </>
            )}
          </Card>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
