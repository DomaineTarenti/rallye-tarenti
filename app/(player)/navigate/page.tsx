"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navigation, QrCode, MapPin, AlertTriangle, Image } from "lucide-react";
import { Button, Card } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import { getDistance, getBearing, formatDistance, getDistanceColor } from "@/lib/geo";
import type { ApiResponse, Step, TeamProgress } from "@/lib/types";

export default function NavigatePage() {
  const router = useRouter();
  const currentStep = usePlayerStore((s) => s.currentStep);
  const objects = usePlayerStore((s) => s.objects);
  const steps = usePlayerStore((s) => s.steps);
  const currentStepIndex = usePlayerStore((s) => s.currentStepIndex);
  const team = usePlayerStore((s) => s.team);
  const session = usePlayerStore((s) => s.session);
  const teamCharacter = usePlayerStore((s) => s.teamCharacter);
  const setObjects = usePlayerStore((s) => s.setObjects);
  const setSteps = usePlayerStore((s) => s.setSteps);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setCurrentStepIndex = usePlayerStore((s) => s.setCurrentStepIndex);
  const setCollectedLetters = usePlayerStore((s) => s.setCollectedLetters);
  const progress = usePlayerStore((s) => s.progress);

  const [dataReady, setDataReady] = useState(false);

  // Always reload game state when navigate mounts — ensures fresh active step
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
          const prog = d.progress as TeamProgress[];
          const stepsList = d.steps as Step[];
          const active = prog.find((p) => p.status === "active");
          if (active) {
            const idx = stepsList.findIndex((s) => s.id === active.step_id);
            if (idx >= 0) setCurrentStepIndex(idx);
          }
          if (d.team && (d.team as Record<string, unknown>).collected_letters) {
            setCollectedLetters((d.team as Record<string, unknown>).collected_letters as Record<string, string>);
          }
        }
      } catch { /* silent */ }
      setDataReady(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id, session?.id]);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [isIOSCompass, setIsIOSCompass] = useState(false);
  const [compassActive, setCompassActive] = useState(false);
  const [needsCompassPermission, setNeedsCompassPermission] = useState(false);
  const headingRef = useRef(0);
  const [gpsError, setGpsError] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const watchRef = useRef<number | null>(null);

  // Derive chapter from completed count
  const completedCount = progress.filter((p) => p.status === "completed").length;
  const chapterNumber = completedCount + 1;
  const totalChapters = team?.object_order?.length ?? steps.length;

  // Find the active step from progress — this is the source of truth
  const activeProgress = progress.find((p) => p.status === "active");
  const activeStep = activeProgress ? steps.find((s) => s.id === activeProgress.step_id) : null;

  // Target object = the object linked to the active step
  const resolvedObject = activeStep
    ? objects.find((o) => o.id === activeStep.object_id)
    : (steps[currentStepIndex] ? objects.find((o) => o.id === steps[currentStepIndex].object_id) : null);

  const targetLat = resolvedObject?.latitude ?? null;
  const targetLng = resolvedObject?.longitude ?? null;
  const hasGPS = targetLat != null && targetLng != null;
  const objectName = resolvedObject?.narrative_name || (resolvedObject?.name ?? "the next artifact");
  const objectDesc = resolvedObject?.description ?? "";
  const teamColor = teamCharacter?.color ?? "#7F77DD";

  // Watch GPS position — mandatory
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsDenied(true);
      return;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGpsError(false);
        setGpsDenied(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsDenied(true);
        } else {
          setGpsError(true);
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  // Compass orientation — smooth heading updates
  function updateHeading(rawHeading: number) {
    // Smooth the heading to avoid jitter (low-pass filter)
    const prev = headingRef.current;
    let diff = rawHeading - prev;
    // Handle wrap-around (350° → 10° should be +20, not -340)
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const smoothed = (prev + diff * 0.3 + 360) % 360;
    headingRef.current = smoothed;
    setHeading(smoothed);
    setCompassActive(true);
  }

  function handleOrientation(e: DeviceOrientationEvent) {
    const webkit = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
    if (webkit != null && webkit >= 0) {
      // iOS: webkitCompassHeading = degrees from true north (clockwise)
      setIsIOSCompass(true);
      updateHeading(webkit);
    } else if (e.alpha != null) {
      // Android: alpha = rotation around z-axis
      // When absolute is true, alpha is from true north
      // Convert: compass heading = (360 - alpha) % 360
      const compassHeading = e.absolute ? (360 - e.alpha) % 360 : (360 - e.alpha) % 360;
      setIsIOSCompass(false);
      updateHeading(compassHeading);
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

  // Calculate distance and bearing
  const distance = (userLat != null && userLng != null && targetLat != null && targetLng != null)
    ? getDistance(userLat, userLng, targetLat, targetLng)
    : null;

  const bearing = (userLat != null && userLng != null && targetLat != null && targetLng != null)
    ? getBearing(userLat, userLng, targetLat, targetLng)
    : 0;

  // Arrow rotation: bearing is direction to target (from north), heading is where device points
  // Arrow should point at (bearing - heading) degrees from the top of screen
  const arrowAngle = ((bearing - heading) + 360) % 360;
  const distColor = distance != null ? getDistanceColor(distance) : "#FFFFFF";

  // Vibrate when close
  useEffect(() => {
    if (distance == null) return;
    if (distance < 5 && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([300, 100, 300]);
    } else if (distance < 20 && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200]);
    }
  }, [distance != null && distance < 20]);

  if (!team) { router.push("/"); return null; }

  if (!dataReady || !resolvedObject) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-deep">
        <p className="text-sm text-gray-500">Loading navigation...</p>
      </main>
    );
  }

  // GPS denied → blocking screen with instructions
  if (gpsDenied) {
    const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
    return (
      <main style={{ minHeight: "100vh", background: "#1a1a2e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>&#x1F9ED;</div>
        <h2 style={{ color: "#EF9F27", fontSize: 20, marginBottom: 12 }}>Localisation requise</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, marginBottom: 32 }}>
          La boussole a besoin de votre position pour vous guider vers les artefacts.
        </p>
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, width: "100%", marginBottom: 24, textAlign: "left" }}>
          {isIOS ? (
            <>
              <p style={{ color: "#EF9F27", fontSize: 13, marginBottom: 8 }}>Conseil : ouvrez dans Safari pour une meilleure exp&eacute;rience</p>
              <p style={{ color: "#7F77DD", fontWeight: 500, marginBottom: 12 }}>Sur iPhone :</p>
              <p style={{ color: "white", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {"1. Fermez cette page\n2. Allez dans Réglages\n3. Faites défiler jusqu'à Safari\n4. Localisation → Lors de l'utilisation\n5. Revenez sur cette page"}
              </p>
            </>
          ) : (
            <>
              <p style={{ color: "#7F77DD", fontWeight: 500, marginBottom: 12 }}>Sur Android :</p>
              <p style={{ color: "white", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {"1. Appuyez sur l'icône 🔒 dans la barre d'adresse\n2. Autorisations → Position\n3. Sélectionnez « Autoriser »\n4. Rechargez la page"}
              </p>
            </>
          )}
        </div>
        <button onClick={() => window.location.reload()} style={{ background: "#7F77DD", color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 16, fontWeight: 500, cursor: "pointer", width: "100%" }}>
          J&apos;ai activ&eacute; la localisation — R&eacute;essayer
        </button>
        {isIOS && (
          <button
            onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
            style={{ background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 24px", fontSize: 13, cursor: "pointer", width: "100%", marginTop: 12 }}
          >
            Copier le lien pour Safari
          </button>
        )}
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 20 }}>
          La localisation est indispensable pour jouer
        </p>
      </main>
    );
  }

  const isClose = distance != null && distance < 10;

  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3">
        <p className="text-xs text-gray-500">Chapter {chapterNumber} of {totalChapters}</p>
        <h1 className="text-lg font-bold">Find: {objectName}</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* GPS acquiring */}
        {userLat == null && (
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-surface">
              <Navigation className="h-10 w-10 animate-pulse text-primary" />
            </div>
            <p className="text-sm text-gray-400">Acquiring GPS signal...</p>
          </div>
        )}

        {/* GPS available — show compass */}
        {hasGPS && userLat != null ? (
          <>
            {/* Compass arrow */}
            <div className="relative mb-6">
              <div className="flex h-48 w-48 items-center justify-center rounded-full border-2 border-white/10 bg-surface">
                <svg
                  viewBox="0 0 100 100"
                  className="h-32 w-32 transition-transform duration-300"
                  style={{ transform: `rotate(${arrowAngle}deg)` }}
                >
                  <polygon
                    points="50,10 40,60 50,50 60,60"
                    fill={distColor}
                    fillOpacity={0.9}
                  />
                  <circle cx="50" cy="50" r="4" fill={distColor} fillOpacity={0.5} />
                </svg>
              </div>
              {/* Distance ring glow when close */}
              {distance != null && distance < 20 && (
                <div
                  className="animate-node-pulse absolute inset-0 rounded-full"
                  style={{ ["--pulse-color" as string]: distColor + "40" }}
                />
              )}
            </div>

            {/* Compass permission button for iOS */}
            {needsCompassPermission && (
              <button
                onClick={requestCompassPermission}
                className="mb-4 rounded-xl bg-amber/20 px-4 py-2 text-sm font-medium text-amber"
              >
                Activer la boussole
              </button>
            )}

            {/* Distance */}
            <p className="mb-1 text-4xl font-black" style={{ color: distColor }}>
              {distance != null ? formatDistance(distance) : "..."}
            </p>

            {distance != null && distance < 5 ? (
              <p className="mb-6 text-sm text-green-400 font-medium">You are very close!</p>
            ) : distance != null && distance < 20 ? (
              <p className="mb-6 text-sm text-amber font-medium">Getting warmer...</p>
            ) : !compassActive ? (
              <p className="mb-6 text-sm text-gray-500">Distance only — compass calibrating...</p>
            ) : (
              <p className="mb-6 text-sm text-gray-500">Follow the arrow</p>
            )}
          </>
        ) : (
          <>
            {/* Object has no GPS coordinates — show distance from user if available */}
            {userLat != null && (
              <div className="mb-4 flex flex-col items-center">
                <Navigation className="h-10 w-10 text-primary mb-2" />
                <p className="text-sm text-gray-400">GPS active — follow the clues</p>
              </div>
            )}

            <h2 className="mb-2 text-xl font-bold text-center">{objectName}</h2>
            {objectDesc && <p className="mb-4 text-center text-sm text-gray-400">{objectDesc}</p>}
            <p className="mb-6 text-center text-xs text-gray-500">Use the clues below to find the artifact</p>
          </>
        )}

        {/* Narrative hint card */}
        <Card className="mb-4 w-full max-w-sm bg-surface">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Clue</span>
          </div>
          <p className="text-sm italic text-gray-300">
            {(activeStep?.text_narratif ?? currentStep?.text_narratif ?? "Search for the artifact nearby...").slice(0, 200)}
            {((activeStep?.text_narratif ?? currentStep?.text_narratif)?.length ?? 0) > 200 ? "..." : ""}
          </p>
        </Card>

        {/* Photo hint */}
        {currentStep?.photo_indice_url && (
          <button
            onClick={() => setShowPhoto(!showPhoto)}
            className="mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-primary"
          >
            <Image className="h-4 w-4" />
            {showPhoto ? "Hide photo clue" : "Show photo clue"}
          </button>
        )}
        {showPhoto && currentStep?.photo_indice_url && (
          <img src={currentStep.photo_indice_url} alt="Clue" className="mb-4 w-full max-w-sm rounded-xl object-cover" style={{ maxHeight: 200 }} />
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-4 pb-6 pt-2">
        <Button
          onClick={() => router.push("/scan")}
          size="lg"
          className={`w-full ${isClose ? "animate-pulse" : ""}`}
        >
          <QrCode className="mr-2 h-5 w-5" />
          {isClose ? "I found it — Scan!" : "Scan the artifact"}
        </Button>
      </div>
    </main>
  );
}
