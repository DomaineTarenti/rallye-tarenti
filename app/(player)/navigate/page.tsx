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

  // Load game state if store is empty
  const loadGameState = useCallback(async () => {
    if (!team || !session) return;
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
  }, [team, session, setObjects, setSteps, setProgress, setCurrentStepIndex, setCollectedLetters]);

  useEffect(() => {
    if (team && session && (steps.length === 0 || progress.length === 0)) loadGameState();
  }, [team, session, steps.length, progress.length, loadGameState]);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [gpsError, setGpsError] = useState(false);
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

  // Watch GPS position
  useEffect(() => {
    if (!hasGPS || typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError(true);
      return;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGpsError(false);
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, [hasGPS]);

  // Listen to device orientation for compass
  useEffect(() => {
    function handleOrientation(e: DeviceOrientationEvent) {
      if (e.alpha != null) setHeading(e.alpha);
    }
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  // Calculate distance and bearing
  const distance = (userLat != null && userLng != null && targetLat != null && targetLng != null)
    ? getDistance(userLat, userLng, targetLat, targetLng)
    : null;

  const bearing = (userLat != null && userLng != null && targetLat != null && targetLng != null)
    ? getBearing(userLat, userLng, targetLat, targetLng)
    : 0;

  const arrowAngle = bearing - heading;
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

  if (!resolvedObject && steps.length === 0) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-deep">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  const canScan = !hasGPS || (distance != null && distance < 10);

  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3">
        <p className="text-xs text-gray-500">Chapter {chapterNumber} of {totalChapters}</p>
        <h1 className="text-lg font-bold">Find: {objectName}</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* GPS available — show compass */}
        {hasGPS && !gpsError && userLat != null ? (
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

            {/* Distance */}
            <p className="mb-1 text-4xl font-black" style={{ color: distColor }}>
              {distance != null ? formatDistance(distance) : "..."}
            </p>

            {distance != null && distance < 5 ? (
              <p className="mb-6 text-sm text-green-400 font-medium">You are very close!</p>
            ) : distance != null && distance < 20 ? (
              <p className="mb-6 text-sm text-amber font-medium">Getting warmer...</p>
            ) : (
              <p className="mb-6 text-sm text-gray-500">Follow the arrow</p>
            )}
          </>
        ) : (
          <>
            {/* Exploration mode — no GPS coordinates, use clues */}
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/15">
              <Navigation className="h-10 w-10 text-primary" />
            </div>

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
          className={`w-full ${canScan ? "animate-pulse" : ""}`}
        >
          <QrCode className="mr-2 h-5 w-5" />
          {canScan ? "I found it — Scan!" : "Scan the artifact"}
        </Button>
      </div>
    </main>
  );
}
