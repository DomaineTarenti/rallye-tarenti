"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, MessageCircle, Send, X, CheckCircle, XCircle } from "lucide-react";
import { usePlayerStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { ApiResponse, AnswerResult, Team, TeamProgress } from "@/lib/types";

type Phase = "question" | "fun_fact";

export default function QuestionPage() {
  const router = useRouter();
  const team = usePlayerStore((s) => s.team);
  const session = usePlayerStore((s) => s.session);
  const currentStep = usePlayerStore((s) => s.currentStep);
  const objects = usePlayerStore((s) => s.objects);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setTeam = usePlayerStore((s) => s.setTeam);

  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("question");
  const [funFact, setFunFact] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  // Offline queue — réponses en attente de réseau
  const [pendingOffline, setPendingOffline] = useState(false);

  // Indice progressif : 0=non demandé, 1=partiel (50%), 2=complet
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [loadingHint, setLoadingHint] = useState(false);

  // Chat Game Master
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; message: string; type: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [unreadFromGM, setUnreadFromGM] = useState(false);
  const showChatRef = useRef(false);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  // Charger les messages existants + abonnement temps réel
  useEffect(() => {
    if (!team) return;
    // Charger l'historique au montage
    supabase
      .from("team_messages")
      .select("id, message, type")
      .eq("team_id", team.id)
      .in("type", ["message", "player_message"])
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setChatMessages(data); });

    const ch = supabase
      .channel(`chat-q-${team.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "team_messages",
        filter: `team_id=eq.${team.id}`,
      }, (payload) => {
        const msg = payload.new as { id: string; message: string; type: string };
        if (msg.type === "message" || msg.type === "player_message") {
          setChatMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.type === "message" && !showChatRef.current) {
            setUnreadFromGM(true);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [team?.id]);

  useEffect(() => {
    if (!team || !currentStep) router.replace("/rally");
  }, [team, currentStep, router]);

  if (!team || !currentStep) return null;

  const targetObject = objects.find((o) => o.id === currentStep.object_id);
  const objectName = targetObject?.name ?? "Animal";
  const objectEmoji = targetObject?.emoji ?? "🐾";

  // Soumission avec queue offline
  async function submitAnswer(teamId: string, stepId: string, answerText: string) {
    const res = await fetch("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId, step_id: stepId, answer: answerText }),
    });
    return res;
  }

  // Flush la queue offline dès que le réseau revient
  useEffect(() => {
    if (!team || !currentStep) return;
    const queueKey = `offline-answer-${team.id}-${currentStep.id}`;

    async function flushQueue() {
      const saved = localStorage.getItem(queueKey);
      if (!saved) return;
      const { answerText } = JSON.parse(saved) as { answerText: string };
      try {
        const res = await submitAnswer(team!.id, currentStep!.id, answerText);
        const json: ApiResponse<AnswerResult> = await res.json();
        if (json.data?.correct) {
          localStorage.removeItem(queueKey);
          setPendingOffline(false);
          setFunFact(json.data.fun_fact ?? "");
          setPhase("fun_fact");
          if (session) {
            const gameRes = await fetch(`/api/game?team_id=${team!.id}&session_id=${session!.id}`);
            const gameJson: ApiResponse = await gameRes.json();
            if (gameJson.data) {
              const d = gameJson.data as Record<string, unknown>;
              setProgress(d.progress as TeamProgress[]);
              if (d.team) setTeam(d.team as Team);
            }
          }
        }
      } catch { /* restera en queue */ }
    }

    // Essayer au montage (si réseau présent)
    if (navigator.onLine) flushQueue();
    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id, currentStep?.id]);

  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || loading) return;
    setLoading(true);
    setErrorMsg(null);

    // Offline : sauvegarder localement et attendre le réseau
    if (!navigator.onLine) {
      const queueKey = `offline-answer-${team!.id}-${currentStep!.id}`;
      localStorage.setItem(queueKey, JSON.stringify({ answerText: answer.trim() }));
      setPendingOffline(true);
      setLoading(false);
      return;
    }

    try {
      const res = await submitAnswer(team!.id, currentStep!.id, answer.trim());
      const json: ApiResponse<AnswerResult> = await res.json();
      const data = json.data;

      if (data?.correct) {
        setFunFact(data.fun_fact ?? "");
        setPhase("fun_fact");
        if (session) {
          const gameRes = await fetch(`/api/game?team_id=${team!.id}&session_id=${session.id}`);
          const gameJson: ApiResponse = await gameRes.json();
          if (gameJson.data) {
            const d = gameJson.data as Record<string, unknown>;
            setProgress(d.progress as TeamProgress[]);
            if (d.team) setTeam(d.team as Team);
          }
        }
      } else {
        setAttempts((a) => a + 1);
        setErrorMsg(data?.message ?? "Mauvaise réponse, essayez encore !");
      }
    } catch {
      setErrorMsg("Erreur de connexion. Vérifiez votre réseau.");
    }
    setLoading(false);
  }

  // Indice progressif : 1er clic → indice partiel, 2e clic → indice complet
  async function handleHint() {
    if (loadingHint) return;

    // Niveau 2 : déjà l'indice en main, juste afficher la suite
    if (hintLevel === 1 && hintText) {
      setHintLevel(2);
      return;
    }

    // Niveau 1 : demander l'indice au serveur (coûte 1 hints_used)
    if (hintLevel === 0) {
      setLoadingHint(true);
      try {
        const res = await fetch("/api/hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team_id: team!.id, step_id: currentStep!.id }),
        });
        const json: ApiResponse = await res.json();
        if (json.data) {
          const data = json.data as Record<string, unknown>;
          setHintText(data.hint_text as string);
          setHintUsed(true);
          setHintLevel(1);
        }
      } catch { /* silent */ }
      setLoadingHint(false);
    }
  }

  // Texte affiché selon le niveau
  const hintDisplayText = hintText
    ? hintLevel === 1
      ? hintText.slice(0, Math.ceil(hintText.length * 0.5)) + "…"
      : hintText
    : null;

  async function sendChatMessage() {
    if (!team || !session || !chatInput.trim()) return;
    setSendingChat(true);
    const newMsg = { id: Date.now().toString(), message: chatInput.trim(), type: "player_message" };
    setChatMessages((prev) => [...prev, newMsg]);
    await fetch("/api/admin/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_id: team.id,
        session_id: session.id,
        message: chatInput.trim(),
        type: "player_message",
      }),
    });
    setChatInput("");
    setSendingChat(false);
  }

  // ─── Phase fun_fact ───────────────────────────────────────────
  if (phase === "fun_fact") {
    return (
      <main className="flex min-h-[100dvh] flex-col bg-deep text-white">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <div className="text-7xl mb-4">{objectEmoji}</div>
          <div className="mb-2 flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-primary">Bonne réponse !</h2>
          </div>

          <div className="mt-6 mb-8 rounded-2xl border border-primary/30 bg-primary/10 px-6 py-5 max-w-sm w-full text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Le saviez-vous ?</p>
            <p className="text-sm leading-relaxed text-gray-200">{funFact}</p>
          </div>

          {targetObject?.is_final ? (
            <>
              <p className="mb-6 text-sm text-gray-400">
                Vous avez complété le Rallye Tarenti !
              </p>
              <button
                onClick={() => router.push("/finish")}
                className="w-full max-w-sm rounded-xl bg-primary py-4 text-lg font-bold text-white transition-all hover:bg-primary-dark active:scale-95 shadow-lg shadow-primary/30"
              >
                🎉 Voir les félicitations !
              </button>
            </>
          ) : (
            <>
              <p className="mb-6 text-sm text-gray-400">
                Super ! Maintenant, prenez une photo souvenir avec {objectName} !
              </p>
              <button
                onClick={() => router.push("/rally/camera")}
                className="w-full max-w-sm rounded-xl bg-primary py-4 text-lg font-bold text-white transition-all hover:bg-primary-dark active:scale-95"
              >
                📸 Prendre la photo !
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  // ─── Phase question ───────────────────────────────────────────
  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3">
        <p className="text-xs text-gray-500">Question</p>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <span>{objectEmoji}</span>
          <span>{objectName}</span>
        </h1>
      </div>

      <div className="flex flex-1 flex-col px-6 py-6 max-w-lg mx-auto w-full">
        {/* Texte d'introduction */}
        {currentStep.intro_text && (
          <div className="mb-6 rounded-xl border border-white/10 bg-surface px-5 py-4">
            <p className="text-sm italic text-gray-300">{currentStep.intro_text}</p>
          </div>
        )}

        {/* Question */}
        <div className="mb-6 rounded-2xl border border-primary/20 bg-surface px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Question</p>
          <p className="text-base font-medium text-white leading-relaxed">{currentStep.question}</p>
        </div>

        {/* Indice progressif */}
        {hintDisplayText && (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-amber-400">
                💡 Indice {hintLevel === 1 ? "(partiel)" : "(complet)"}
              </p>
              {hintLevel === 1 && (
                <button
                  onClick={() => setHintLevel(2)}
                  className="text-[10px] font-semibold text-amber-300 underline"
                >
                  Voir plus
                </button>
              )}
            </div>
            <p className="text-sm text-gray-200">{hintDisplayText}</p>
          </div>
        )}

        {/* Message offline en attente */}
        {pendingOffline && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <span className="text-lg">📶</span>
            <p className="text-sm text-amber-300">Réponse sauvegardée — envoi automatique dès que le réseau revient</p>
          </div>
        )}

        {/* Erreur */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
            <XCircle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleAnswer} className="space-y-3">
          <input
            id="answer"
            name="answer"
            type="text"
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setErrorMsg(null); }}
            placeholder="Votre réponse..."
            autoComplete="off"
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-center text-lg font-semibold text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={!answer.trim() || loading}
            className="w-full rounded-xl bg-primary py-3 text-base font-bold text-white transition-all hover:bg-primary-dark active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Vérification..." : "Valider ✓"}
          </button>
        </form>

        {attempts > 0 && (
          <p className="mt-2 text-center text-xs text-gray-600">{attempts} tentative{attempts > 1 ? "s" : ""}</p>
        )}
      </div>

      {/* Chat panel */}
      {showChat && (
        <div className="border-t border-white/10 bg-surface px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Game Master</span>
            <button onClick={() => setShowChat(false)}><X className="h-4 w-4 text-gray-500" /></button>
          </div>
          <div className="mb-2 max-h-28 overflow-y-auto space-y-1.5">
            {chatMessages.length === 0 && <p className="text-xs text-gray-600 italic">Posez votre question...</p>}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`rounded-lg px-3 py-1.5 text-xs ${msg.type === "player_message" ? "bg-primary/20 text-primary ml-8" : "bg-white/10 text-gray-300 mr-8"}`}>
                {msg.message}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              id="chat-q-input"
              name="chat-q-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
              placeholder="Message au Game Master..."
              autoComplete="off"
              className="flex-1 rounded-lg border border-white/10 bg-deep px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none"
            />
            <button onClick={sendChatMessage} disabled={!chatInput.trim() || sendingChat} className="rounded-lg bg-primary px-3 py-2 text-white disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Actions bas */}
      <div className="flex gap-2 px-4 pb-6 pt-2">
        <button
          onClick={handleHint}
          disabled={(hintLevel === 2) || loadingHint || !currentStep.hint}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-medium transition ${
            hintLevel === 2
              ? "bg-amber-400/10 text-amber-400/50 cursor-default"
              : currentStep.hint
              ? "bg-amber-400/20 text-amber-400 hover:bg-amber-400/30"
              : "bg-surface text-gray-600 cursor-not-allowed"
          }`}
        >
          <Lightbulb className="h-4 w-4" />
          {hintLevel === 2 ? "Indice complet" : hintLevel === 1 ? "Suite de l'indice" : loadingHint ? "..." : "Indice"}
        </button>
        <button
          onClick={() => { setShowChat(!showChat); setUnreadFromGM(false); }}
          className="relative flex items-center gap-1.5 rounded-xl bg-surface px-4 py-3 text-sm text-gray-400 hover:text-primary"
        >
          <MessageCircle className={`h-4 w-4 ${unreadFromGM ? "text-red-400" : ""}`} />
          <span className="text-sm">Game Master</span>
          {unreadFromGM && (
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-deep" />
          )}
        </button>
      </div>
    </main>
  );
}
