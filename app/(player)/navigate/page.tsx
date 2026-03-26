"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navigation, QrCode, MapPin, AlertTriangle, Image } from "lucide-react";
import { Button, Card } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import { getDistance, getBearing, formatDistance, getDistanceColor } from "@/lib/geo";

export default function NavigatePage() {
  const router = useRouter();
  const currentStep = usePlayerStore((s) => s.currentStep);
  const objects = usePlayerStore((s) => s.objects);
  const steps = usePlayerStore((s) => s.steps);
  const currentStepIndex = usePlayerStore((s) => s.currentStepIndex);
  const team = usePlayerStore((s) => s.team);
  const teamCharacter = usePlayerStore((s) => s.teamCharacter);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [gpsError, setGpsError] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const watchRef = useRef<number | null>(null);

  const targetObject = currentStep
    ? objects.find((o) => o.id === currentStep.object_id)
    : null;

  const targetLat = targetObject?.latitude ?? null;
  const targetLng = targetObject?.longitude ?? null;
  const hasGPS = targetLat != null && targetLng != null;
  const objectName = targetObject?.name ?? "the next artifact";
  const objectDesc = targetObject?.description ?? "";
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

  const canScan = distance != null && distance < 10;

  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3">
        <p className="text-xs text-gray-500">Chapter {currentStepIndex + 1} of {steps.length}</p>
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
            {/* No GPS — show hint-based navigation */}
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface">
              {gpsError ? (
                <AlertTriangle className="h-10 w-10 text-amber" />
              ) : (
                <Navigation className="h-10 w-10 animate-pulse text-primary" />
              )}
            </div>

            {gpsError && (
              <p className="mb-2 text-sm text-amber">GPS unavailable</p>
            )}

            <h2 className="mb-2 text-xl font-bold text-center">{objectName}</h2>
            <p className="mb-6 text-center text-sm text-gray-400">{objectDesc}</p>
          </>
        )}

        {/* Narrative hint card */}
        <Card className="mb-4 w-full max-w-sm bg-surface">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Clue</span>
          </div>
          <p className="text-sm italic text-gray-300">
            {currentStep?.text_narratif?.slice(0, 150) ?? "Search for the artifact nearby..."}
            {(currentStep?.text_narratif?.length ?? 0) > 150 ? "..." : ""}
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
