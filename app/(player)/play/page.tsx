"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  MapPin,
  Send,
  ImageIcon,
  ShieldCheck,
  Hexagon,
  X,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { Button, Card, Loader, BottomNav } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import { calculateScore } from "@/lib/scoring";
import type { ApiResponse, Step, TeamProgress, ScoringConfig } from "@/lib/types";

function getEnigmaInputType(step: Step): "text" | "code" | "qcm" | "photo" | "staff" {
  if (step.type === "epreuve") return "staff";
  if (step.type === "navigation") return "text";
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

export default function PlayPage() {
  const router = useRouter();
  const session = usePlayerStore((s) => s.session);
  const team = usePlayerStore((s) => s.team);
  const teamCharacter = usePlayerStore((s) => s.teamCharacter);
  const steps = usePlayerStore((s) => s.steps);
  const currentStep = usePlayerStore((s) => s.currentStep);
  const currentStepIndex = usePlayerStore((s) => s.currentStepIndex);
  const score = usePlayerStore((s) => s.score);
  const progress = usePlayerStore((s) => s.progress);
  const setSteps = usePlayerStore((s) => s.setSteps);
  const setObjects = usePlayerStore((s) => s.setObjects);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setCurrentStep = usePlayerStore((s) => s.setCurrentStep);
  const setCurrentStepIndex = usePlayerStore((s) => s.setCurrentStepIndex);
  const setScore = usePlayerStore((s) => s.setScore);

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [hintData, setHintData] = useState<{ text: string | null; photoUrl: string | null } | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);
  const [questComplete, setQuestComplete] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showRank, setShowRank] = useState(false);
  const [rankTeams, setRankTeams] = useState<Array<{ name: string; score: number; character: string | null }>>([]);
  const [photoExpanded, setPhotoExpanded] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const loadGameState = useCallback(async () => {
    if (!team || !session) return;
    setLoadingGame(true);
    try {
      const res = await fetch(`/api/game?team_id=${team.id}&session_id=${session.id}`);
      const json: ApiResponse = await res.json();
      if (json.data) {
        const d = json.data as Record<string, unknown>;
        setObjects(d.objects as never[]);
        setSteps(d.steps as never[]);
        setProgress(d.progress as never[]);
        setScore(d.score as number);

        const prog = d.progress as TeamProgress[];
        const stepsList = d.steps as Step[];
        const activeProgress = prog.find((p) => p.status === "active");
        if (activeProgress) {
          const activeStep = stepsList.find((s) => s.id === activeProgress.step_id);
          if (activeStep) {
            setCurrentStep(activeStep);
            setCurrentStepIndex(stepsList.indexOf(activeStep));
          }
        } else {
          setQuestComplete(true);
        }
      }
    } catch { /* use cache */ } finally {
      setLoadingGame(false);
    }
  }, [team, session, setObjects, setSteps, setProgress, setScore, setCurrentStep, setCurrentStepIndex]);

  useEffect(() => {
    if (hydrated && team && session && steps.length === 0) loadGameState();
  }, [hydrated, team, session, steps.length, loadGameState]);

  if (!hydrated) return null;
  if (!session || !team) { router.push("/"); return null; }

  if (loadingGame) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-6 pb-20">
        <Loader text="Loading your quest..." />
      </main>
    );
  }

  // Quest complete
  if (questComplete || (steps.length > 0 && !currentStep)) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-20">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber/20">
          <Trophy className="h-10 w-10 text-amber" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Quest Complete!</h1>
        <p className="mb-6 text-gray-400">Congratulations, {team.name}!</p>
        <Card className="mb-6 w-full max-w-sm bg-surface text-center">
          <p className="text-xs uppercase tracking-wider text-gray-500">Final Rank Points</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <Hexagon className="h-5 w-5 text-amber" />
            <span className="text-4xl font-bold text-amber">{score}</span>
            <span className="text-sm text-gray-500">RP</span>
          </div>
        </Card>
        <Button onClick={() => router.push("/")} variant="secondary">Return Home</Button>
        <BottomNav />
      </main>
    );
  }

  // No steps
  if (steps.length === 0) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-20">
        <MapPin className="mb-4 h-12 w-12 text-gray-600" />
        <h2 className="mb-2 text-lg font-bold">Awaiting Orders</h2>
        <p className="text-center text-sm text-gray-400">
          The quest path has not yet been configured. Await your organiser.
        </p>
        <Button onClick={loadGameState} variant="secondary" className="mt-6">Refresh</Button>
        <BottomNav />
      </main>
    );
  }

  const step = currentStep!;
  const enigmaType = getEnigmaInputType(step);
  const currentProgress = progress.find((p) => p.step_id === step.id);
  const teamColor = teamCharacter?.color ?? "#7F77DD";

  async function handleSubmitAnswer() {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: team!.id, step_id: step.id, answer: answer.trim() }),
      });
      const json: ApiResponse = await res.json();
      const result = json.data as { correct: boolean; message: string } | null;

      if (result?.correct) {
        setFeedback({ type: "success", message: "Correct! Well done." });
        // Recalculate score with updated progress
        const updatedProgress = progress.map((p) =>
          p.step_id === step.id ? { ...p, status: "completed" as const, completed_at: new Date().toISOString() } : p
        );
        setProgress(updatedProgress);
        setScore(calculateScore(null, updatedProgress as TeamProgress[]));
        setTimeout(() => {
          const nextIdx = currentStepIndex + 1;
          if (nextIdx < steps.length) {
            setCurrentStepIndex(nextIdx);
            setCurrentStep(steps[nextIdx]);
            setAnswer("");
            setFeedback(null);
            setHintData(null);
          } else {
            setQuestComplete(true);
          }
        }, 2000);
      } else {
        setFeedback({ type: "error", message: result?.message ?? "Incorrect answer" });
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
      }
    } catch {
      setFeedback({ type: "error", message: "Connection error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHint() {
    if (hintLoading) return;
    setHintLoading(true);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: team!.id, step_id: step.id }),
      });
      const json: ApiResponse = await res.json();
      const data = json.data as { hint_text: string | null; hint_photo_url: string | null; hints_used: number; penalty: number } | null;
      if (data) {
        setHintData({ text: data.hint_text, photoUrl: data.hint_photo_url });
        setScore(Math.max(0, score - data.penalty));
        setProgress(progress.map((p) => p.step_id === step.id ? { ...p, hints_used: data.hints_used } : p));
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to request hint" });
    } finally {
      setHintLoading(false);
    }
  }

  async function loadRankings() {
    setShowRank(true);
    try {
      // Fetch all teams for this session via the game API
      const res = await fetch(`/api/game?team_id=${team!.id}&session_id=${session!.id}`);
      const json: ApiResponse = await res.json();
      // For now, show own team — full ranking would need a dedicated endpoint
      if (json.data) {
        setRankTeams([{ name: team!.name, score, character: teamCharacter?.animalEmoji ?? null }]);
      }
    } catch { /* silent */ }
  }

  // Badge initials
  const initials = team.name.slice(0, 2).toUpperCase();

  // Completed steps for journal
  const completedSteps = steps.filter((s, i) => {
    const p = progress.find((pr) => pr.step_id === s.id);
    return p?.status === "completed";
  });

  return (
    <main className="flex min-h-[100dvh] flex-col pb-20">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 border-b border-white/5 bg-deep/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: teamColor }}
            >
              {initials}
            </div>
            <span className="text-sm font-semibold">
              Chapter {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-amber">
            <Hexagon className="h-4 w-4" />
            <span className="text-sm font-bold">{score} RP</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 space-y-4 px-4 pt-4">
        {/* ── Narrative card with accent border ── */}
        <div className="rounded-2xl border border-white/5 bg-surface p-5" style={{ borderLeftWidth: 3, borderLeftColor: teamColor }}>
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Revelation
          </span>
          <p className="text-sm italic leading-relaxed text-gray-300">
            {step.text_narratif || "Explore your surroundings and seek the next artifact..."}
          </p>
        </div>

        {/* ── Photo hint thumbnail ── */}
        {step.photo_indice_url && (
          <>
            <button
              onClick={() => setPhotoExpanded(true)}
              className="w-full overflow-hidden rounded-2xl border border-white/5"
            >
              <img src={step.photo_indice_url} alt="Clue" className="h-40 w-full object-cover" />
            </button>
            {photoExpanded && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPhotoExpanded(false)}>
                <img src={step.photo_indice_url} alt="Clue" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
                <button className="absolute right-4 top-4 text-white"><X className="h-6 w-6" /></button>
              </div>
            )}
          </>
        )}

        {/* ── Hint display ── */}
        {hintData && (
          <Card className="border-amber/20 bg-amber/5">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-amber">Hint</span>
            {hintData.text && <p className="text-sm text-amber/90">{hintData.text}</p>}
            {hintData.photoUrl && (
              <img src={hintData.photoUrl} alt="Hint" className="mt-2 w-full rounded-lg object-cover" style={{ maxHeight: 150 }} />
            )}
          </Card>
        )}

        {/* ── Enigma card ── */}
        <Card className={`bg-surface ${shaking ? "animate-shake" : ""}`}>
          <div className="mb-3 flex items-center gap-2 text-primary">
            <MapPin className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
              {step.type === "epreuve" ? "Challenge" : "Riddle"}
            </span>
          </div>

          {step.enigme && !step.enigme.includes("|") && (
            <p className="mb-4 font-medium text-white">{step.enigme}</p>
          )}

          {/* Text input */}
          {enigmaType === "text" && (
            <div className="flex gap-2">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Your answer..."
                className="flex-1 rounded-xl border border-white/10 bg-deep px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()}
              />
              <Button onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting} className="px-4">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Code input */}
          {enigmaType === "code" && (
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="0000"
                maxLength={6}
                className="flex-1 rounded-xl border border-white/10 bg-deep px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()}
              />
              <Button onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting} className="px-4">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* QCM */}
          {enigmaType === "qcm" && (() => {
            const { question, choices } = parseQCMChoices(step.enigme!);
            return (
              <>
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
              </>
            );
          })()}

          {/* Photo upload */}
          {enigmaType === "photo" && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 bg-deep p-6 transition hover:border-white/20">
              <ImageIcon className="h-8 w-8 text-gray-500" />
              <span className="text-sm text-gray-400">Capture evidence to submit</span>
              <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={() => setFeedback({ type: "info", message: "Photo submitted! A Guardian will verify." })}
              />
            </label>
          )}

          {/* Staff validation */}
          {enigmaType === "staff" && (
            <div className="animate-guardian-pulse rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
              <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-primary" />
              <p className="font-medium text-white">Find the Guardian</p>
              <p className="mt-1 text-sm text-gray-400">A Guardian must validate this challenge</p>
            </div>
          )}
        </Card>

        {/* Feedback */}
        {feedback && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
            feedback.type === "success" ? "bg-green-500/10 text-green-400"
            : feedback.type === "error" ? "bg-red-500/10 text-red-400"
            : "bg-blue-500/10 text-blue-400"
          }`}>
            {feedback.message}
          </div>
        )}
      </div>

      {/* ── Journal overlay ── */}
      {showJournal && (
        <div className="fixed inset-0 z-50 bg-deep/95 backdrop-blur-md">
          <div className="flex h-full flex-col px-6 pt-8 pb-24">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen className="h-5 w-5 text-primary" /> Journal</h2>
              <button onClick={() => setShowJournal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {completedSteps.length === 0 && (
                <p className="text-center text-sm text-gray-500">No chapters completed yet.</p>
              )}
              {completedSteps.map((s, i) => (
                <Card key={s.id} className="bg-surface">
                  <div className="mb-1 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-xs font-semibold text-gray-400">Chapter {steps.indexOf(s) + 1}</span>
                  </div>
                  <p className="text-sm text-gray-300">{s.text_narratif?.slice(0, 120)}...</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Rank overlay ── */}
      {showRank && (
        <div className="fixed inset-0 z-50 bg-deep/95 backdrop-blur-md">
          <div className="flex h-full flex-col px-6 pt-8 pb-24">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Trophy className="h-5 w-5 text-amber" /> Live Rankings</h2>
              <button onClick={() => setShowRank(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {rankTeams.map((t, i) => (
                <Card key={i} className="bg-surface">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-amber">#{i + 1}</span>
                      <span>{t.character}</span>
                      <span className="font-medium">{t.name}</span>
                    </div>
                    <span className="font-bold text-amber">{t.score} RP</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <BottomNav
        onHint={handleHint}
        onJournal={() => setShowJournal(true)}
        onRank={loadRankings}
      />
    </main>
  );
}
