"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Navigation, MapPin, MessageCircle, Send, X, AlertOctagon, CheckCircle } from "lucide-react";
import { Card } from "@/components/shared";
import { supabase } from "@/lib/supabase";
import { usePlayerStore } from "@/lib/store";
import { getDistance, getBearing, formatDistance, getDistanceColor } from "@/lib/geo";
import { GEOFENCE_RADIUS_M } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";

// Leaflet chargé côté client uniquement
const RallyMap = dynamic(() => import("@/components/RallyMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-900">
      <Navigation className="h-8 w-8 text-gray-600 animate-pulse" />
    </div>
  ),
});

export default function RallyPage() {
  const router = useRouter();
  const team = usePlayerStore((s) => s.team);
  const session = usePlayerStore((s) => s.session);
  const objects = usePlayerStore((s) => s.objects);
  const steps = usePlayerStore((s) => s.steps);
  const progress = usePlayerStore((s) => s.progress);
  const setObjects = usePlayerStore((s) => s.setObjects);
  const setSteps = usePlayerStore((s) => s.setSteps);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setCurrentStep = usePlayerStore((s) => s.setCurrentStep);
  const setCurrentStepIndex = usePlayerStore((s) => s.setCurrentStepIndex);

  const [dataReady, setDataReady] = useState(false);

  // Recharger l'état du jeu à chaque montage
  useEffect(() => {
    if (!team || !session) return;
    setDataReady(false);
    (async () => {
      try {
        const res = await fetch(`/api/game?team_id=${team.id}&session_id=${session.id}`);
        const json: ApiResponse = await res.json();
        if (json.data) {
          const d = json.data as Record<string, unknown>;
          setObjects(d.objects as never[]);
          setSteps(d.steps as never[]);
          setProgress(d.progress as never[]);
          const teamData = d.team as Record<string, unknown>;
          if (teamData?.status === "finished") {
            router.replace("/finish");
            return;
          }
        }
      } catch { /* silent */ }
      setDataReady(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id, session?.id]);

  // ─── Chat Game Master ────────────────────────────────────────
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; message: string; type: string; created_at: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [helpSent, setHelpSent] = useState(false);

  // Timer
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const elapsedSeconds = team?.started_at
    ? Math.floor((Date.now() - new Date(team.started_at).getTime()) / 1000)
    : 0;
  const elapsedDisplay = team?.started_at
    ? `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`
    : null;
  void tick; // used to trigger re-render

  const [unreadFromGM, setUnreadFromGM] = useState(false);
  const showChatRef = useRef(false);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  useEffect(() => {
    if (!team) return;
    supabase
      .from("team_messages")
      .select("id, message, type, created_at")
      .eq("team_id", team.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setChatMessages(data); });

    const ch = supabase
      .channel(`chat-${team.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "team_messages",
        filter: `team_id=eq.${team.id}`,
      }, (payload) => {
        const msg = payload.new as { id: string; message: string; type: string; created_at: string };
        setChatMessages((prev) => [...prev, msg]);
        // Badge rouge si le chat est fermé et c'est un message du GM
        if (msg.type === "message" && !showChatRef.current) {
          setUnreadFromGM(true);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [team?.id]);

  async function sendHelp() {
    if (!team || !session || helpSent) return;
    setHelpSent(true);
    await fetch("/api/admin/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_id: team.id,
        session_id: session.id,
        message: `🆘 ${team.name} a besoin d'aide ! (étape : ${objectName})`,
        type: "help_request",
      }),
    });
  }

  async function sendChatMessage() {
    if (!team || !session || !chatInput.trim()) return;
    setSendingChat(true);
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

  // ─── GPS ─────────────────────────────────────────────────────
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [needsCompassPermission, setNeedsCompassPermission] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false);
  const headingRef = useRef(0);
  const watchRef = useRef<number | null>(null);

  // Étape active
  const activeProgress = progress.find((p) => p.status === "active");
  const activeStep = activeProgress ? steps.find((s) => s.id === activeProgress.step_id) : null;
  const resolvedObject = activeStep ? objects.find((o) => o.id === activeStep.object_id) : null;

  const targetLat = resolvedObject?.latitude ?? null;
  const targetLng = resolvedObject?.longitude ?? null;
  const objectName = resolvedObject?.name ?? "le prochain animal";
  const objectEmoji = resolvedObject?.emoji ?? "🐾";
  const objectDesc = resolvedObject?.description ?? "";

  const completedCount = progress.filter((p) => p.status === "completed" || p.status === "skipped").length;
  const totalSteps = steps.length;

  // Watch GPS
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsDenied(true);
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGpsDenied(false);
      },
      (err) => { if (err.code === err.PERMISSION_DENIED) setGpsDenied(true); },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  // Boussole
  function updateHeading(raw: number) {
    const prev = headingRef.current;
    let diff = raw - prev;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const smoothed = (prev + diff * 0.3 + 360) % 360;
    headingRef.current = smoothed;
    setHeading(smoothed);
  }

  function handleOrientation(e: DeviceOrientationEvent) {
    const webkit = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
    if (webkit != null && webkit >= 0) {
      updateHeading(webkit);
    } else if (e.alpha != null) {
      updateHeading((360 - e.alpha) % 360);
    }
  }

  useEffect(() => {
    const doe = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof doe.requestPermission === "function") {
      setNeedsCompassPermission(true);
    } else {
      window.addEventListener("deviceorientation", handleOrientation);
      window.addEventListener("deviceorientationabsolute", handleOrientation as EventListener);
      return () => {
        window.removeEventListener("deviceorientation", handleOrientation);
        window.removeEventListener("deviceorientationabsolute", handleOrientation as EventListener);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestCompassPermission() {
    const doe = DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> };
    try {
      const perm = await doe.requestPermission();
      if (perm === "granted") {
        setNeedsCompassPermission(false);
        window.addEventListener("deviceorientation", handleOrientation);
      }
    } catch { /* denied */ }
  }

  useEffect(() => {
    if (!needsCompassPermission) return;
    function onTouch() { requestCompassPermission(); }
    document.addEventListener("touchstart", onTouch, { once: true });
    return () => document.removeEventListener("touchstart", onTouch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsCompassPermission]);

  // Calculs GPS
  const distance =
    userLat != null && userLng != null && targetLat != null && targetLng != null
      ? getDistance(userLat, userLng, targetLat, targetLng)
      : null;

  const bearing =
    userLat != null && userLng != null && targetLat != null && targetLng != null
      ? getBearing(userLat, userLng, targetLat, targetLng)
      : 0;

  const arrowAngle = ((bearing - heading) + 360) % 360;
  const distColor = distance != null ? getDistanceColor(distance) : "#FFFFFF";
  const isInGeofence = distance != null && distance < GEOFENCE_RADIUS_M;

  // Vibration à l'arrivée
  useEffect(() => {
    if (isInGeofence && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([300, 100, 300]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInGeofence]);

  function handleArrive() {
    if (!activeStep) return;
    setCurrentStep(activeStep);
    setCurrentStepIndex(completedCount);
    router.push("/rally/question");
  }

  // ─── Guards ──────────────────────────────────────────────────
  useEffect(() => {
    if (dataReady && !team) router.push("/");
  }, [dataReady, team, router]);

  if (!team) return null;

  if (gpsDenied) {
    const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
    return (
      <main style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🧭</div>
        <h2 style={{ color: "#EF9F27", fontSize: 20, marginBottom: 12 }}>Localisation requise</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, marginBottom: 32 }}>
          La carte a besoin de votre position GPS pour vous guider vers les animaux.
        </p>
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, width: "100%", marginBottom: 24, textAlign: "left" }}>
          {isIOS ? (
            <>
              <p style={{ color: "#EF9F27", fontSize: 13, marginBottom: 8 }}>Conseil : utilisez Safari</p>
              <p style={{ color: "#2D7D46", fontWeight: 500, marginBottom: 12 }}>Sur iPhone :</p>
              <p style={{ color: "white", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {"1. Fermez cette page\n2. Allez dans Réglages\n3. Faites défiler jusqu'à Safari\n4. Localisation → Lors de l'utilisation\n5. Revenez sur cette page"}
              </p>
            </>
          ) : (
            <>
              <p style={{ color: "#2D7D46", fontWeight: 500, marginBottom: 12 }}>Sur Android :</p>
              <p style={{ color: "white", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {"1. Appuyez sur l'icône 🔒 dans la barre d'adresse\n2. Autorisations → Position\n3. Sélectionnez « Autoriser »\n4. Rechargez la page"}
              </p>
            </>
          )}
        </div>
        <button onClick={() => window.location.reload()} style={{ background: "#2D7D46", color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 16, fontWeight: 600, cursor: "pointer", width: "100%" }}>
          J&apos;ai activé la localisation — Réessayer
        </button>
      </main>
    );
  }

  if (!dataReady) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-deep">
        <p className="text-sm text-gray-500">Chargement...</p>
      </main>
    );
  }

  if (!resolvedObject) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-deep px-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-2">Rallye terminé !</h2>
        <button onClick={() => router.push("/finish")} className="mt-6 rounded-xl bg-primary px-8 py-3 text-white font-bold">
          Voir les résultats
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep text-white">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-xs text-gray-500">Étape {completedCount + 1} / {totalSteps}</p>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span>{objectEmoji}</span>
            <span>{objectName}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {elapsedDisplay && (
            <div className="text-right">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Temps</p>
              <p className="font-mono text-sm font-bold text-gray-300">{elapsedDisplay}</p>
            </div>
          )}
          {/* Pastilles de progression */}
          <div className="flex gap-1">
            {steps.map((_, i) => {
              const prog = progress[i];
              const done = prog?.status === "completed" || prog?.status === "skipped";
              const active = prog?.status === "active";
              return (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all ${
                    done ? "bg-primary" : active ? "bg-amber-400 animate-pulse" : "bg-white/20"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Carte Leaflet ──────────────────────────────────── */}
      <div className="relative shrink-0" style={{ height: "52vh" }}>
        {userLat != null && targetLat != null ? (
          <RallyMap
            userLat={userLat}
            userLng={userLng!}
            targetLat={targetLat}
            targetLng={targetLng!}
            targetEmoji={objectEmoji}
            isInGeofence={isInGeofence}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900">
            <Navigation className="h-10 w-10 text-gray-600 animate-pulse mb-3" />
            <p className="text-sm text-gray-500">Acquisition GPS...</p>
          </div>
        )}

        {/* Indicateur géofence par-dessus la carte */}
        {isInGeofence && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-primary/90 rounded-2xl px-5 py-3 flex items-center gap-2 shadow-xl">
              <CheckCircle className="h-5 w-5 text-white" />
              <span className="text-white font-bold">Vous y êtes !</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Distance + flèche boussole ─────────────────────── */}
      {userLat != null && !isInGeofence && (
        <div className="flex items-center justify-center gap-4 py-3 shrink-0">
          {/* Petite flèche directionnelle */}
          <svg
            viewBox="0 0 40 40"
            className="h-8 w-8 transition-transform duration-300 shrink-0"
            style={{ transform: `rotate(${arrowAngle}deg)` }}
          >
            <polygon points="20,4 14,24 20,20 26,24" fill={distColor} />
            <circle cx="20" cy="20" r="3" fill={distColor} fillOpacity={0.5} />
          </svg>
          <p className="text-3xl font-black" style={{ color: distColor }}>
            {distance != null ? formatDistance(distance) : "..."}
          </p>
          {distance != null && distance < 30 && (
            <p className="text-sm text-amber-400 font-medium">Approche !</p>
          )}
        </div>
      )}

      {/* Permission boussole iOS */}
      {needsCompassPermission && !isInGeofence && (
        <div className="flex justify-center shrink-0">
          <button
            onClick={requestCompassPermission}
            className="flex items-center gap-2 rounded-xl bg-amber-400/20 px-4 py-2 text-sm font-medium text-amber-400 animate-pulse"
          >
            🧭 Activer la boussole
          </button>
        </div>
      )}

      {/* ─── Indice narratif ────────────────────────────────── */}
      <div className="flex-1 px-4 py-2 overflow-hidden">
        <Card className="w-full bg-surface">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Indice</span>
          </div>
          <p className="text-sm italic text-gray-300 leading-relaxed">{objectDesc}</p>
        </Card>
      </div>

      {/* ─── Chat panel ─────────────────────────────────────── */}
      {showChat && (
        <div className="border-t border-white/10 bg-surface px-4 py-3 shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Game Master</span>
            <button onClick={() => setShowChat(false)}><X className="h-4 w-4 text-gray-500" /></button>
          </div>
          <div className="mb-2 max-h-28 overflow-y-auto space-y-1.5">
            {chatMessages.filter((m) => m.type === "message" || m.type === "player_message").length === 0 && (
              <p className="text-xs text-gray-600 italic">Aucun message pour l&apos;instant</p>
            )}
            {chatMessages
              .filter((m) => m.type === "message" || m.type === "player_message")
              .map((msg) => (
                <div key={msg.id} className={`rounded-lg px-3 py-1.5 text-xs ${msg.type === "player_message" ? "bg-primary/20 text-primary ml-8" : "bg-white/10 text-gray-300 mr-8"}`}>
                  {msg.message}
                </div>
              ))}
          </div>
          <div className="flex gap-2">
            <input
              id="chat-input"
              name="chat-input"
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

      {/* ─── Actions bas ────────────────────────────────────── */}
      <div className="flex gap-2 px-4 pb-6 pt-2 shrink-0">
        <button
          onClick={() => { sendHelp(); setShowChat(true); }}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-medium transition ${helpSent ? "bg-red-500/20 text-red-400" : "bg-surface text-gray-400 hover:text-red-400"}`}
        >
          <AlertOctagon className="h-4 w-4" />
          {helpSent ? "Envoyé" : "Aide"}
        </button>
        <button
          onClick={() => { setShowChat(!showChat); setUnreadFromGM(false); }}
          className="relative flex items-center gap-1.5 rounded-xl bg-surface px-4 py-3 text-sm text-gray-400 hover:text-primary"
        >
          <MessageCircle className={`h-4 w-4 ${unreadFromGM ? "text-red-400" : ""}`} />
          {unreadFromGM && (
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-deep" />
          )}
        </button>
        <button
          onClick={handleArrive}
          disabled={!isInGeofence || !activeStep}
          className={`flex-1 rounded-xl py-3 text-base font-bold text-white transition-all active:scale-95 ${
            isInGeofence
              ? "bg-primary shadow-lg shadow-primary/30"
              : distance != null && distance < 50
              ? "bg-amber-500/30 text-amber-300 cursor-not-allowed"
              : "bg-surface text-gray-500 cursor-not-allowed"
          }`}
        >
          {isInGeofence
            ? `Nous y sommes ! ${objectEmoji}`
            : distance != null && distance < 50
            ? `Approche... encore ${formatDistance(distance)}`
            : distance != null
            ? `Encore ${formatDistance(distance)}`
            : "Trouver l'animal"}
        </button>
      </div>
    </main>
  );
}
