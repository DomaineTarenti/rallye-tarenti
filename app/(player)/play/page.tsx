"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Hexagon, MapPin, Send, ImageIcon, ShieldCheck, Lightbulb, QrCode, X, Trophy, MessageSquare, Compass, Search, BookOpen,
} from "lucide-react";
import { Button, Card, Loader } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { formatElapsed } from "@/lib/scoring";
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

interface HintData { level: number; text: string }

export default function PlayPage() {
  const router = useRouter();
  const session = usePlayerStore((s) => s.session);
  const team = usePlayerStore((s) => s.team);
  const teamCharacter = usePlayerStore((s) => s.teamCharacter);
  const steps = usePlayerStore((s) => s.steps);
  const objects = usePlayerStore((s) => s.objects);
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
  const collectedLetters = usePlayerStore((s) => s.collectedLetters);
  const setCollectedLetters = usePlayerStore((s) => s.setCollectedLetters);
  const setTeam = usePlayerStore((s) => s.setTeam);

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "info"; msg: string } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [hints, setHints] = useState<HintData[]>([]);
  const [hintLoading, setHintLoading] = useState<number | null>(null);
  const [usedHintLevels, setUsedHintLevels] = useState<number[]>([]);
  const [loadingGame, setLoadingGame] = useState(false);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"play" | "journal">("play");
  const [introDismissed, setIntroDismissed] = useState(false);
  const [elapsed, setElapsed] = useState("00:00");
  const startTime = usePlayerStore((s) => s.startTime);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      const st = usePlayerStore.getState().startTime;
      if (!st) return;
      setElapsed(formatElapsed(Date.now() - st));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Realtime admin messages
  useEffect(() => {
    if (!team) return;
    const ch = supabase
      .channel(`msg-${team.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages", filter: `team_id=eq.${team.id}` },
        (payload) => {
          setToast((payload.new as { message: string }).message);
          setTimeout(() => setToast(null), 10000);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [team]);

  // Realtime: detect when a guardian validates an epreuve
  useEffect(() => {
    if (!team || !currentStep || currentStep.type !== "epreuve") return;

    const ch = supabase
      .channel(`progress-${team.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "team_progress",
        filter: `team_id=eq.${team.id}`,
      }, (payload) => {
        const row = payload.new as { step_id: string; status: string };
        if (row.step_id === currentStep.id && row.status === "completed") {
          console.log("[PLAY] Epreuve validated by guardian — advancing");
          // Update local progress
          setProgress(progress.map((p) =>
            p.step_id === currentStep.id ? { ...p, status: "completed" as const, completed_at: new Date().toISOString() } : p
          ));
          setCurrentStepScore(30);
          setScore(score + 30);
          router.push("/celebrate");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [team, currentStep, progress, score, setProgress, setCurrentStepScore, setScore, router]);

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
          const idx = stepsList.findIndex((s) => s.id === active.step_id);
          if (idx >= 0) setCurrentStepIndex(idx);
          // Don't auto-set currentStep — it's set by scanning
        }
        // Load collected letters from team
        if (d.team && (d.team as Record<string, unknown>).collected_letters) {
          setCollectedLetters((d.team as Record<string, unknown>).collected_letters as Record<string, string>);
        }
      }
    } catch { /* cache */ } finally { setLoadingGame(false); }
  }, [team, session, setObjects, setSteps, setProgress, setScore, setCurrentStep, setCurrentStepIndex]);

  useEffect(() => {
    if (team && session && steps.length === 0) loadGameState();
  }, [team, session, steps.length, loadGameState]);

  useEffect(() => {
    if (currentStep) { setStepStartTime(Date.now()); setHints([]); setUsedHintLevels([]); setAnswer(""); }
  }, [currentStep, setStepStartTime]);

  if (!session || !team) { router.push("/"); return null; }

  // Quest complete
  const allComplete = steps.length > 0 && !progress.find((p) => p.status === "active" || p.status === "locked");
  if (allComplete && !currentStep) {
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

  if (loadingGame) {
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

  // Show intro screen on first step before any scanning
  const completedAny = progress.some((p) => p.status === "completed");
  const showIntro = session.intro_text && currentStepIndex === 0 && !completedAny && !introDismissed;
  if (showIntro) {
    const teamColor = teamCharacter?.color ?? "#7F77DD";
    return (
      <main className="flex min-h-[100dvh] flex-col bg-deep">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 text-5xl">&#x1F3F0;</div>
          <h1 className="mb-4 text-2xl font-bold text-white">{session.name}</h1>
          <Card className="mb-6 w-full max-w-sm bg-surface">
            <p className="text-sm italic leading-relaxed text-gray-300">{session.intro_text}</p>
          </Card>
          {session.intro_enigme && (
            <Card className={`mb-6 w-full max-w-sm bg-surface ${shaking ? "animate-shake" : ""}`}>
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">First Riddle</span>
              <p className="mb-3 font-medium text-white">{session.intro_enigme}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Your answer..."
                  className="flex-1 rounded-xl border border-white/10 bg-deep px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && answer.trim()) {
                      const normalize = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      if (session.intro_answer && normalize(answer) === normalize(session.intro_answer)) {
                        setIntroDismissed(true);
                        setAnswer("");
                        setFeedback(null);
                      } else {
                        setFeedback({ type: "error", msg: "Not quite... try again!" });
                        setShaking(true);
                        setTimeout(() => setShaking(false), 400);
                      }
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (!answer.trim()) return;
                    const normalize = (s: string) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (session.intro_answer && normalize(answer) === normalize(session.intro_answer)) {
                      setIntroDismissed(true);
                      setAnswer("");
                      setFeedback(null);
                    } else {
                      setFeedback({ type: "error", msg: "Not quite... try again!" });
                      setShaking(true);
                      setTimeout(() => setShaking(false), 400);
                    }
                  }}
                  disabled={!answer.trim()}
                  className="px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {feedback && (
                <p className={`mt-2 text-sm ${feedback.type === "error" ? "text-red-400" : "text-green-400"}`}>{feedback.msg}</p>
              )}
            </Card>
          )}
          {!session.intro_enigme && (
            <Button onClick={() => setIntroDismissed(true)} size="lg" className="w-full max-w-sm">
              Begin the Quest
            </Button>
          )}
        </div>
      </main>
    );
  }

  // No current step — player needs to scan the next object first
  if (!currentStep) {
    router.replace("/navigate");
    return null;
  }

  const step = currentStep;
  const enigmaType = getEnigmaInputType(step);
  const teamColor = teamCharacter?.color ?? "#7F77DD";
  const initials = team.name.slice(0, 2).toUpperCase();

  // Get current object name for scan context
  const currentObject = objects.find((o) => o.id === step.object_id);
  const objectName = currentObject?.narrative_name || (currentObject?.name ?? "the artifact");
  const objectDesc = currentObject?.description ?? "";

  // Team-relative chapter number (from completed count, not DB order)
  const completedCount = progress.filter((p) => p.status === "completed").length;
  const chapterNumber = completedCount + 1;
  const totalChapters = team.object_order?.length ?? steps.length;

  const currentProgress = progress.find((p) => p.step_id === step.id);

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
      const result = json.data as { correct: boolean; message: string; hidden_letter?: string; physical_id?: string } | null;

      if (result?.correct) {
        const updated = progress.map((p) =>
          p.step_id === step.id ? { ...p, status: "completed" as const, completed_at: new Date().toISOString() } : p
        );
        setProgress(updated);
        // Score calculated at the end — no per-step RP
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

  async function requestHint(level: number) {
    if (hintLoading !== null || usedHintLevels.includes(level)) return;
    setHintLoading(level);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: team!.id, step_id: step.id, hint_level: level }),
      });
      const json: ApiResponse = await res.json();
      const data = json.data as { hint_text: string; penalty: number; hint_type: string } | null;
      if (data) {
        setHints((prev) => [...prev, { level, text: data.hint_text }]);
        setUsedHintLevels((prev) => [...prev, level]);
        setScore(Math.max(0, score - data.penalty));
      } else if (json.error) {
        setFeedback({ type: "info", msg: json.error });
      }
    } catch { /* silent */ }
    finally { setHintLoading(null); }
  }

  async function callForHelp() {
    if (usedHintLevels.includes(3)) return;
    setHintLoading(3);
    try {
      // Create help request message
      await fetch("/api/admin/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: team!.id,
          session_id: session!.id,
          message: `\u{1F198} Team "${team!.name}" needs help at Chapter ${chapterNumber}: ${objectName}`,
          type: "help_request",
        }),
      });
      setHints((prev) => [...prev, { level: 3, text: "The Game Master has been alerted... A guardian will come to help you." }]);
      setUsedHintLevels((prev) => [...prev, 3]);
      setScore(Math.max(0, score - 50));
    } catch { /* silent */ }
    finally { setHintLoading(null); }
  }

  async function handleStaffCode() {
    if (answer.trim().length !== 4 || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code_id: answer.trim(), team_id: team!.id, session_id: session!.id }),
      });
      const json = await res.json();
      const result = json.data;
      if (result?.valid) {
        const updated = progress.map((p) =>
          p.step_id === step.id ? { ...p, status: "completed" as const, completed_at: new Date().toISOString() } : p
        );
        setProgress(updated);
        // Score calculated at the end — no per-step RP
        router.push("/celebrate");
      } else {
        setFeedback({ type: "error", msg: result?.message ?? "Invalid code" });
      }
    } catch {
      setFeedback({ type: "error", msg: "Connection error" });
    } finally {
      setSubmitting(false);
    }
  }

  const HINT_BUTTONS = [
    { level: 1, label: "Rephrase", cost: 15, color: "text-amber", bg: "border-amber/20" },
    { level: 2, label: "Direction", cost: 25, color: "text-orange-400", bg: "border-orange-400/20" },
    { level: 3, label: "Help!", cost: 50, color: "text-red-400", bg: "border-red-400/20", isHelp: true },
  ];

  return (
    <main className="flex min-h-[100dvh] flex-col pb-6">
      {/* Toast */}
      {toast && (
        <div className="fixed left-4 right-4 top-4 z-50 flex items-start gap-3 rounded-xl bg-amber/95 px-4 py-3 shadow-lg" onClick={() => setToast(null)}>
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-deep" />
          <p className="text-sm font-medium text-deep">{toast}</p>
          <button className="ml-auto shrink-0 text-deep/60"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/5 bg-deep/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: teamColor }}>{initials}</div>
            <span className="text-sm font-semibold">Chapter {chapterNumber} of {totalChapters}</span>
          </div>
          <span className="font-mono text-sm font-bold text-amber">{elapsed}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${(completedCount / totalChapters) * 100}%` }} />
        </div>

        {/* Tab bar */}
        <div className="mt-2 flex gap-1">
          <button
            onClick={() => setActiveTab("play")}
            className={`flex-1 rounded-lg py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${activeTab === "play" ? "bg-white/10 text-white" : "text-gray-500"}`}
          >
            Quest
          </button>
          <button
            onClick={() => setActiveTab("journal")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${activeTab === "journal" ? "bg-white/10 text-white" : "text-gray-500"}`}
          >
            <BookOpen className="h-3 w-3" /> Journal
          </button>
        </div>
      </div>

      {/* Journal tab */}
      {activeTab === "journal" ? (
        <div className="flex-1 px-4 pt-4">
          <Card className="bg-surface">
            <h2 className="mb-3 text-center text-sm font-bold text-white">The Labyrinth Clues</h2>
            <div className="mb-4 flex justify-center gap-1.5">
              {objects.map((obj) => {
                const letter = obj.physical_id ? collectedLetters[obj.physical_id] : null;
                return (
                  <div
                    key={obj.id}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black ${
                      letter
                        ? "text-white"
                        : "border border-white/10 bg-white/5 text-gray-600"
                    }`}
                    style={letter ? { backgroundColor: teamColor } : undefined}
                  >
                    {letter ?? "?"}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-gray-500">
              {Object.keys(collectedLetters).length} / {objects.length} clues collected
            </p>
          </Card>
        </div>
      ) : (
      <>
      <div className="flex-1 space-y-4 px-4 pt-4">
        {/* Narrative */}
        <div className="rounded-2xl border border-white/5 bg-surface p-5" style={{ borderLeftWidth: 3, borderLeftColor: teamColor }}>
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Revelation</span>
          <p className="text-sm italic leading-relaxed text-gray-300">{step.text_narratif || "Explore your surroundings..."}</p>
        </div>

        {/* Photo */}
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

        {/* Hints display */}
        {hints.map((h, i) => (
          <Card key={i} className={`${h.level === 3 ? "border-red-400/20 bg-red-500/5" : h.level === 2 ? "border-orange-400/20 bg-orange-500/5" : "border-amber/20 bg-amber/5"}`}>
            <span className={`mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] ${h.level === 3 ? "text-red-400" : h.level === 2 ? "text-orange-400" : "text-amber"}`}>
              {h.level === 3 ? "Answer Revealed" : h.level === 2 ? "Direction" : "Hint"}
            </span>
            <p className={`text-sm ${h.level === 3 ? "text-red-300" : h.level === 2 ? "text-orange-300" : "text-amber/90"}`}>{h.text}</p>
          </Card>
        ))}

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
                onChange={() => setFeedback({ type: "info", msg: "Photo submitted!" })} />
            </label>
          )}

          {enigmaType === "staff" && (
            <div className="space-y-3">
              <div className="animate-guardian-pulse rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
                <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-primary" />
                <p className="font-medium text-white">Find the Guardian</p>
                <p className="mt-1 text-sm text-gray-400">The Guardian will validate your challenge</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-surface p-4">
                <p className="mb-2 text-center text-xs text-gray-500">Or enter the Guardian&apos;s code</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="4-digit code"
                    maxLength={4}
                    className="flex-1 rounded-xl border border-white/10 bg-deep px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-white placeholder-gray-500 focus:border-primary focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && answer.trim().length === 4 && handleStaffCode()}
                  />
                  <Button onClick={handleStaffCode} disabled={answer.trim().length !== 4 || submitting} className="px-4">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {feedback && (
                  <p className={`mt-2 text-center text-sm ${feedback.type === "error" ? "text-red-400" : "text-green-400"}`}>{feedback.msg}</p>
                )}
              </div>
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

      {/* Bottom: 3 hint buttons + scan */}
      <div className="space-y-2 px-4 pt-2">
        {/* Hint buttons row */}
        {enigmaType !== "staff" && (
          <div className="flex gap-2">
            {HINT_BUTTONS.map((h) => {
              const used = usedHintLevels.includes(h.level);
              const isLoading = hintLoading === h.level;
              return (
                <button
                  key={h.level}
                  onClick={() => (h as { isHelp?: boolean }).isHelp ? callForHelp() : requestHint(h.level)}
                  disabled={used || isLoading || hintLoading !== null}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl border bg-surface px-2 py-2.5 text-[10px] transition disabled:opacity-30 ${h.bg}`}
                >
                  {isLoading ? (
                    <Lightbulb className="h-4 w-4 animate-pulse text-gray-400" />
                  ) : (
                    <Lightbulb className={`h-4 w-4 ${used ? "text-gray-600" : h.color}`} />
                  )}
                  <span className={used ? "text-gray-600 line-through" : "text-gray-400"}>{h.label}</span>
                  <span className={used ? "text-gray-600" : h.color}>-{h.cost}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Navigate button — go find the next object */}
        <Button onClick={() => router.push("/navigate")} variant="secondary" className="flex w-full items-center justify-center gap-2">
          <Compass className="h-5 w-5" />
          <span>View map / Navigate</span>
        </Button>
      </div>
      </>
      )}
    </main>
  );
}
