"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, RotateCcw, Check, Loader, RefreshCw } from "lucide-react";
import { usePlayerStore } from "@/lib/store";
import type { ApiResponse, Photo, TeamProgress, Team } from "@/lib/types";

type Phase = "camera" | "preview" | "uploading" | "done";

export default function CameraPage() {
  const router = useRouter();
  const team = usePlayerStore((s) => s.team);
  const session = usePlayerStore((s) => s.session);
  const currentStep = usePlayerStore((s) => s.currentStep);
  const objects = usePlayerStore((s) => s.objects);
  const addPhoto = usePlayerStore((s) => s.addPhoto);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setTeam = usePlayerStore((s) => s.setTeam);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFailCount, setCameraFailCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  // Orientation réelle de la vidéo (détectée au moment de la capture)
  const [isLandscape, setIsLandscape] = useState(false);

  const targetObject = currentStep ? objects.find((o) => o.id === currentStep.object_id) : null;
  const objectName = targetObject?.name ?? "Animal";
  const objectEmoji = targetObject?.emoji ?? "🐾";

  // Précharger le cadre PNG "Domaine Tarenti"
  useEffect(() => {
    const img = new Image();
    img.src = "/frames/tarenti-frame.png";
    img.onload = () => { frameRef.current = img; setFrameLoaded(true); };
    img.onerror = () => setFrameLoaded(false); // cadre optionnel
  }, []);

  // Démarrer la caméra avec le mode choisi (arrière ou selfie)
  const startCamera = useCallback(async (mode: "environment" | "user" = "environment") => {
    setCameraError(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1080 },
          height: { ideal: 1440 },
          aspectRatio: { ideal: 0.75 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraFailCount((c) => c + 1);
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les autorisations.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function flipCamera() {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    await startCamera(newMode);
  }

  useEffect(() => {
    if (phase !== "camera") streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [phase]);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return;

    // Détecter l'orientation réelle du flux vidéo
    const landscape = vw > vh;
    setIsLandscape(landscape);

    // Dimensions finales : 3:2 paysage ou 2:3 portrait
    const W = landscape ? 1200 : 800;
    const H = landscape ? 800 : 1200;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // Crop centré pour remplir le canvas sans déformation
    const targetRatio = W / H;
    const videoRatio = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (videoRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    // Miroir horizontal pour la caméra frontale (effet selfie naturel)
    if (facingMode === "user") {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-W, 0);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
      ctx.restore();
    } else {
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
    }

    // Logo Tarenti en bas à droite — taille proportionnelle, sans déformation
    if (frameRef.current && frameLoaded) {
      const logoH = Math.round(H * 0.18); // 18% de la hauteur
      const logoW = Math.round(logoH * (frameRef.current.naturalWidth / frameRef.current.naturalHeight));
      const margin = Math.round(H * 0.025);
      ctx.drawImage(frameRef.current, W - logoW - margin, H - logoH - margin, logoW, logoH);
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setPhase("preview");
      },
      "image/jpeg",
      0.82
    );
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setUploadError(null);
    setPhase("camera");
    startCamera(facingMode);
  }

  async function validate() {
    if (!capturedBlob || !team || !currentStep) return;
    setPhase("uploading");
    setUploadError(null);

    try {
      // Envoi via FormData (plus léger que base64 JSON)
      const formData = new FormData();
      formData.append("team_id", team.id);
      formData.append("step_id", currentStep.id);
      formData.append("object_id", currentStep.object_id);
      formData.append("image", capturedBlob, "photo.jpg");

      const res = await fetch("/api/photo", { method: "POST", body: formData });
      const json: ApiResponse = await res.json();

      if (!res.ok || json.error) {
        setUploadError(json.error ?? "Erreur lors de l'envoi de la photo. Réessayez.");
        setPhase("preview");
        return;
      }

      if (json.data) addPhoto(json.data as Photo);

      // Rafraîchir la progression
      if (session) {
        const gameRes = await fetch(`/api/game?team_id=${team.id}&session_id=${session.id}`);
        const gameJson: ApiResponse = await gameRes.json();
        if (gameJson.data) {
          const d = gameJson.data as Record<string, unknown>;
          setProgress(d.progress as TeamProgress[]);
          const teamData = d.team as Record<string, unknown>;
          if (teamData) setTeam(teamData as unknown as Team);
          if (teamData?.status === "finished") {
            setPhase("done");
            setTimeout(() => router.push("/finish"), 1200);
            return;
          }
        }
      }

      setPhase("done");
      setTimeout(() => router.push("/rally"), 1200);
    } catch {
      setUploadError("Erreur inattendue. Réessayez.");
      setPhase("preview");
    }
  }

  async function skipPhoto() {
    // Passer la photo si la caméra est inaccessible
    if (!team || !session) { router.push("/rally"); return; }
    try {
      const gameRes = await fetch(`/api/game?team_id=${team.id}&session_id=${session.id}`);
      const gameJson: ApiResponse = await gameRes.json();
      if (gameJson.data) {
        const d = gameJson.data as Record<string, unknown>;
        setProgress(d.progress as TeamProgress[]);
        const teamData = d.team as Record<string, unknown>;
        if (teamData) setTeam(teamData as unknown as Team);
      }
    } catch { /* silent */ }
    router.push("/rally");
  }

  useEffect(() => {
    if (!team || !currentStep) router.replace("/rally");
  }, [team, currentStep, router]);

  if (!team || !currentStep) return null;

  return (
    <main className="flex min-h-[100dvh] flex-col bg-black text-white">
      {/* Header flottant */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <div>
          <p className="text-xs text-gray-400">Photo souvenir</p>
          <h1 className="text-sm font-bold flex items-center gap-1.5">
            <span>{objectEmoji}</span>
            <span>{objectName}</span>
          </h1>
        </div>
        {/* Espace réservé pour aligner le header */}
        <div style={{ width: 40, height: 40 }} />
      </div>

      {/* Zone caméra / preview */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {phase === "camera" && (
          <>
            {cameraError ? (
              <div className="flex flex-col items-center justify-center px-8 text-center">
                <Camera className="h-16 w-16 text-gray-600 mb-4" />
                <p className="text-sm text-gray-400 mb-6">{cameraError}</p>
                <button onClick={() => startCamera(facingMode)} className="rounded-xl bg-primary px-6 py-3 text-white font-medium mb-3">
                  Réessayer
                </button>
                {cameraFailCount >= 2 && (
                  <button
                    onClick={skipPhoto}
                    className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm text-gray-300 backdrop-blur"
                  >
                    Continuer sans photo
                  </button>
                )}
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                />
                {/* Overlay cadre PNG Domaine Tarenti */}
                {frameLoaded && (
                  <img
                    src="/frames/tarenti-frame.png"
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                  />
                )}
                {/* Overlay SVG de secours si pas de PNG */}
                {!frameLoaded && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                    {/* Coins de cadre */}
                    <div className="flex justify-between">
                      <svg width="40" height="40" viewBox="0 0 40 40"><path d="M0 20 L0 0 L20 0" stroke="white" strokeWidth="3" fill="none" opacity="0.8"/></svg>
                      <svg width="40" height="40" viewBox="0 0 40 40"><path d="M40 20 L40 0 L20 0" stroke="white" strokeWidth="3" fill="none" opacity="0.8"/></svg>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-xs font-semibold tracking-widest uppercase">Domaine Tarenti</p>
                    </div>
                    <div className="flex justify-between">
                      <svg width="40" height="40" viewBox="0 0 40 40"><path d="M0 20 L0 40 L20 40" stroke="white" strokeWidth="3" fill="none" opacity="0.8"/></svg>
                      <svg width="40" height="40" viewBox="0 0 40 40"><path d="M40 20 L40 40 L20 40" stroke="white" strokeWidth="3" fill="none" opacity="0.8"/></svg>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {(phase === "preview" || phase === "uploading") && previewUrl && (
          <img src={previewUrl} alt="Aperçu photo" className="h-full w-full object-cover" />
        )}

        {phase === "uploading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <Loader className="h-12 w-12 text-primary animate-spin mb-3" />
            <p className="text-sm text-white">Envoi de la photo...</p>
          </div>
        )}

        {phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <div className="text-6xl mb-3">✅</div>
            <p className="text-lg font-bold text-white">Photo enregistrée !</p>
          </div>
        )}
      </div>

      {/* Canvas caché */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Erreur upload */}
      {uploadError && (
        <div className="absolute bottom-28 left-4 right-4 rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-center z-20">
          <p className="text-sm text-red-300">{uploadError}</p>
        </div>
      )}

      {/* Boutons */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 pb-8 pt-12 z-10">
        {phase === "camera" && !cameraError && (
          <div className="flex items-center justify-center gap-8">
            {/* Flip caméra — toujours visible en phase caméra */}
            <button
              onClick={flipCamera}
              className="flex items-center justify-center rounded-full bg-black/40 backdrop-blur border border-white/30 text-white"
              style={{ width: 48, height: 48 }}
              title={facingMode === "environment" ? "Passer en selfie" : "Caméra arrière"}
            >
              <RefreshCw className="h-5 w-5" />
            </button>

            {/* Déclencheur */}
            <button
              onClick={capture}
              className="flex items-center justify-center rounded-full border-4 border-white bg-white/20 backdrop-blur transition-transform active:scale-90"
              style={{ width: 72, height: 72 }}
            >
              <Camera className="h-8 w-8 text-white" />
            </button>

            {/* Espace symétrique */}
            <div style={{ width: 48, height: 48 }} />
          </div>
        )}

        {/* Flip visible aussi en cas d'erreur caméra (essayer l'autre caméra) */}
        {phase === "camera" && cameraError && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={flipCamera}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-gray-300 backdrop-blur"
            >
              <RefreshCw className="h-4 w-4" />
              Essayer l&apos;autre caméra
            </button>
          </div>
        )}

        {phase === "preview" && (
          <div className="flex gap-4 justify-center">
            <button
              onClick={retake}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-white backdrop-blur font-medium"
            >
              <RotateCcw className="h-4 w-4" />
              Reprendre
            </button>
            <button
              onClick={validate}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-white font-bold"
            >
              <Check className="h-4 w-4" />
              Valider !
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
