"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Hexagon, MapPin, Send, ImageIcon, ShieldCheck, Lightbulb, QrCode, X, Trophy, MessageSquare,
} from "lucide-react";
import { Button, Card, Loader } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { ApiResponse, Step, TeamProgress } from "@/lib/types";

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
  const setCurrentStepScore = usePlayerStore((s) => s.setCurrentStepScore);
  const setStepStartTime = usePlayerStore((s) => s.setStepStartTime);

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "info"; msg: string } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [hintData, setHintData] = useState<{ text: string | null; photoUrl: string | null } | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Realtime: listen for admin messages
  useEffect(() => {
    if (!team) return;
    const ch = supabase
      .channel(`msg-${team.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages", filter: `team_id=eq.${team.id}` },
        (payload) => {
          const msg = (payload.new as { message: string }).message;
          setToast(msg);
          setTimeout(() => setToast(null), 10000);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [team]);

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
        const active = prog.find((p) => p.status === "active");
        if (active) {
          const s = stepsList.find((s) => s.id === active.step_id);
          if (s) { setCurrentStep(s); setCurrentStepIndex(stepsList.indexOf(s)); }
        }
      }
    } catch { /* cache */ } finally { setLoadingGame(false); }
  }, [team, session, setObjects, setSteps, setProgress, setScore, setCurrentStep, setCurrentStepIndex]);

  useEffect(() => {
    if (team && session && steps.length === 0) loadGameState();
  }, [team, session, steps.length, loadGameState]);

  // Start step timer when step changes
  useEffect(() => {
    if (currentStep) setStepStartTime(Date.now());
  }, [currentStep, setStepStartTime]);

  if (!session || !team) { router.push("/"); return null; }

  // Quest complete — go to map
  const allComplete = steps.length > 0 && !progress.find((p) => p.status === "active" || p.status === "locked");
  if (allComplete) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-6">
        <Trophy className="mb-4 h-16 w-16 text-amber" />
        <h1 className="mb-2 text-2xl font-bold">Quest Complete!</h1>
        <p className="mb-4 text-gray-400">Congratulations, {team.name}!</p>
        <Card className="mb-6 w-full max-w-sm bg-surface text-center">
          <div className="flex items-center justify-center gap-2">
            <Hexagon className="h-5 w-5 text-amber" />
            <span className="text-3xl font-bold text-amber">{score} RP</span>
          </div>
        </Card>
        <Button onClick={() => router.push("/map")} className="w-full max-w-sm">View your journey</Button>
      </main>
    );
  }

  if (loadingGame || !currentStep) {
    return (
      <main className="flex min-h-[100dvh] flex-col pb-6">
        <div className="border-b border-white/5 bg-deep/95 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
          </div>
          <div className="mt-2 h-1 animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="space-y-4 px-4 pt-4">
          <div className="h-28 animate-pulse rounded-2xl bg-surface" />
          <div className="h-36 animate-pulse rounded-2xl bg-surface" />
        </div>
      </main>
    );
  }

  const step = currentStep;
  const enigmaType = getEnigmaInputType(step);
  const teamColor = teamCharacter?.color ?? "#7F77DD";
  const initials = team.name.slice(0, 2).toUpperCase();

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
        // Update progress optimistically
        const updated = progress.map((p) =>
          p.step_id === step.id ? { ...p, status: "completed" as const, completed_at: new Date().toISOString() } : p
        );
        setProgress(updated);
        setCurrentStepScore(30);
        setScore(score + 30);
        router.push("/celebrate");
      } else {
        setFeedback({ type: "error", msg: result?.message ?? "Not quite... try again!" });
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
      }
    } catch {
      setFeedback({ type: "error", msg: "Connection error" });
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
      }
    } catch { /* silent */ }
    finally { setHintLoading(false); }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col pb-6">
      {/* Admin message toast */}
      {toast && (
        <div className="fixed left-4 right-4 top-4 z-50 flex items-start gap-3 rounded-xl bg-amber/95 px-4 py-3 shadow-lg" onClick={() => setToast(null)}>
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-deep" />
          <p className="text-sm font-medium text-deep">{toast}</p>
          <button className="ml-auto shrink-0 text-deep/60"><X className="h-4 w-4" /></button>
        </div>
      )}
      {/* ── Minimal header ── */}
      <div className="sticky top-0 z-10 border-b border-white/5 bg-deep/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: teamColor }}>
              {initials}
            </div>
            <span className="text-sm font-semibold">Chapter {currentStepIndex + 1} of {steps.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber">
            <Hexagon className="h-4 w-4" />
            <span className="text-sm font-bold">{score} RP</span>
          </div>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${((currentStepIndex) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 space-y-4 px-4 pt-4">
        {/* Narrative */}
        <div className="rounded-2xl border border-white/5 bg-surface p-5" style={{ borderLeftWidth: 3, borderLeftColor: teamColor }}>
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Revelation</span>
          <p className="text-sm italic leading-relaxed text-gray-300">{step.text_narratif || "Explore your surroundings..."}</p>
        </div>

        {/* Photo indice */}
        {step.photo_indice_url && (
          <>
            <button onClick={() => setPhotoExpanded(true)} className="w-full overflow-hidden rounded-2xl border border-white/5">
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

        {/* Hint */}
        {hintData && (
          <Card className="border-amber/20 bg-amber/5">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-amber">Hint</span>
            {hintData.text && <p className="text-sm text-amber/90">{hintData.text}</p>}
            {hintData.photoUrl && <img src={hintData.photoUrl} alt="Hint" className="mt-2 w-full rounded-lg object-cover" style={{ maxHeight: 150 }} />}
          </Card>
        )}

        {/* Enigma */}
        <Card className={`bg-surface ${shaking ? "animate-shake" : ""}`}>
          <div className="mb-3 flex items-center gap-2 text-primary">
            <MapPin className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">{step.type === "epreuve" ? "Challenge" : "Riddle"}</span>
          </div>

          {step.enigme && !step.enigme.includes("|") && <p className="mb-4 font-medium text-white">{step.enigme}</p>}

          {enigmaType === "text" && (
            <div className="flex gap-2">
              <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer..."
                className="flex-1 rounded-xl border border-white/10 bg-deep px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()} />
              <Button onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting} className="px-4"><Send className="h-4 w-4" /></Button>
            </div>
          )}

          {enigmaType === "code" && (
            <div className="flex gap-2">
              <input type="number" inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="0000"
                className="flex-1 rounded-xl border border-white/10 bg-deep px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()} />
              <Button onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting} className="px-4"><Send className="h-4 w-4" /></Button>
            </div>
          )}

          {enigmaType === "qcm" && (() => {
            const { question, choices } = parseQCMChoices(step.enigme!);
            return (<>
              <p className="mb-4 font-medium text-white">{question}</p>
              <div className="space-y-2">
                {choices.map((c, i) => (
                  <button key={i} onClick={() => setAnswer(c)} disabled={submitting}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${answer === c ? "border-primary bg-primary/15 text-white" : "border-white/10 bg-deep text-gray-300 hover:border-white/20"}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${answer === c ? "bg-primary text-white" : "bg-white/5 text-gray-500"}`}>{QCM_LETTERS[i]}</span>
                    {c}
                  </button>
                ))}
              </div>
              {answer && <Button onClick={handleSubmitAnswer} disabled={submitting} className="mt-3 w-full">Submit</Button>}
            </>);
          })()}

          {enigmaType === "photo" && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 bg-deep p-6 hover:border-white/20">
              <ImageIcon className="h-8 w-8 text-gray-500" />
              <span className="text-sm text-gray-400">Capture evidence</span>
              <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={() => setFeedback({ type: "info", msg: "Photo submitted! A Guardian will verify." })} />
            </label>
          )}

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
          <div className={`rounded-xl px-4 py-3 text-sm font-medium ${feedback.type === "error" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
            {feedback.msg}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-4 pt-2">
        <div className="flex gap-3">
          <button onClick={handleHint} disabled={hintLoading}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface px-4 py-3 text-xs text-gray-400 transition hover:text-amber disabled:opacity-50">
            <Lightbulb className="h-4 w-4" />
            Hint <span className="text-amber/70">-15</span>
          </button>
          <Button onClick={() => router.push("/scan")} className="flex flex-1 items-center justify-center gap-2">
            <QrCode className="h-5 w-5" /> Decipher the Sigil
          </Button>
        </div>
      </div>
    </main>
  );
}
