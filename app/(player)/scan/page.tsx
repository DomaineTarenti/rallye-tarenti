"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Keyboard,
  QrCode,
} from "lucide-react";
import { Button, Card, Input, BottomNav } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import type { ApiResponse, ScanResult } from "@/lib/types";

export default function ScanPage() {
  const router = useRouter();

  // Subscribe to hydration flag + display values
  const hasHydrated = usePlayerStore((s) => s._hasHydrated);
  const team = usePlayerStore((s) => s.team);
  const session = usePlayerStore((s) => s.session);
  const currentStep = usePlayerStore((s) => s.currentStep);
  const objects = usePlayerStore((s) => s.objects);
  const setCurrentStep = usePlayerStore((s) => s.setCurrentStep);

  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);

  // Wait for Zustand to hydrate from localStorage, THEN check team/session
  useEffect(() => {
    if (!hasHydrated) return; // still loading from localStorage
    if (!team || !session) {
      console.log("[SCAN PAGE] No team/session after hydration, redirecting home");
      router.replace("/");
      return;
    }
    console.log("[SCAN PAGE] Ready — team:", team.name, "session:", session.name);
    setReady(true);
  }, [hasHydrated, team, session, router]);

  // Get current object info for display
  const currentObject = currentStep ? objects.find((o) => o.id === currentStep.object_id) : null;
  const objectName = currentObject?.narrative_name || (currentObject?.name ?? "the artifact");
  const objectDesc = currentObject?.description ?? "";

  const processScan = useCallback(
    async (qrCodeId: string) => {
      if (processingRef.current) return;

      // Read fresh state at scan time
      const state = usePlayerStore.getState();
      const t = state.team;
      const s = state.session;

      console.log("[SCAN FRONT] team:", t?.id, "session:", s?.id, "qr_code:", qrCodeId);

      if (!t || !s) {
        console.error("[SCAN FRONT] No team/session in store at scan time");
        setScanResult({ valid: false, reason: "unknown", message: "Session expired. Please rejoin." });
        return;
      }

      processingRef.current = true;
      setProcessing(true);

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qr_code_id: qrCodeId,
            team_id: t.id,
            session_id: s.id,
          }),
        });

        const json: ApiResponse<ScanResult> = await res.json();
        console.log("[SCAN FRONT] API response:", JSON.stringify(json));

        const result = json.data;

        if (!result) {
          setScanResult({ valid: false, reason: "unknown", message: json.error ?? "Server communication error." });
        } else {
          setScanResult(result);

          if (result.valid && result.step) {
            setCurrentStep(result.step);
            setTimeout(() => router.push("/play"), 1500);
          }
        }
      } catch (err) {
        console.error("[SCAN FRONT] Fetch error:", err);
        setScanResult({ valid: false, reason: "unknown", message: "Connection error. Check your network." });
      } finally {
        processingRef.current = false;
        setProcessing(false);
      }
    },
    [setCurrentStep, router]
  );

  // Initialize QR scanner
  useEffect(() => {
    if (!ready || !scannerRef.current || manualMode || scanResult) return;

    let html5QrCode: { stop: () => Promise<void>; start: Function } | null = null;
    let alive = true;

    async function initScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!alive) return;

        html5QrCode = new Html5Qrcode("qr-reader");

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (decodedText: string) => {
            html5QrCode?.stop().catch(() => {});
            setScanning(false);
            processScan(decodedText);
          },
          () => {}
        );

        if (alive) setScanning(true);
      } catch {
        if (alive) {
          setCameraError("Camera not accessible. Use the staff code instead.");
          setManualMode(true);
        }
      }
    }

    initScanner();
    return () => {
      alive = false;
      html5QrCode?.stop().catch(() => {});
    };
  }, [ready, manualMode, scanResult, processScan]);

  // Loading state while waiting for hydration
  if (!ready) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-deep">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  function handleManualSubmit() {
    if (!manualCode.trim()) return;
    processScan(manualCode.trim().toUpperCase());
  }

  function handleRetry() {
    setScanResult(null);
    setManualCode("");
    setCameraError(null);
  }

  const resultIcon = scanResult?.valid ? (
    <CheckCircle2 className="h-16 w-16 text-green-400" />
  ) : scanResult?.reason === "wrong_order" ? (
    <AlertTriangle className="h-16 w-16 text-amber" />
  ) : (
    <XCircle className="h-16 w-16 text-red-400" />
  );

  const resultTitle = scanResult?.valid
    ? "Sigil Deciphered!"
    : scanResult?.reason === "wrong_order"
    ? "Wrong Path"
    : scanResult?.reason === "already_scanned"
    ? "Already Claimed"
    : "Unknown Sigil";

  const resultMessage = scanResult?.valid
    ? "The artifact reveals its secrets..."
    : scanResult?.reason === "wrong_order"
    ? "This sigil speaks not to you yet... your path lies elsewhere."
    : scanResult?.reason === "already_scanned"
    ? "You have already claimed this artifact."
    : scanResult?.message ?? "This sigil is unrecognized.";

  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => router.push("/play")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-gray-400 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Decipher the Sigil</h1>
          <p className="text-xs text-gray-500 truncate max-w-[200px]">{objectName}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center px-4">
        {/* Scan result */}
        {scanResult && (
          <Card className="mb-6 w-full max-w-sm bg-surface text-center">
            <div className="mb-4 flex justify-center">{resultIcon}</div>
            <h2 className={`mb-2 text-lg font-bold ${
              scanResult.valid ? "text-green-400"
              : scanResult.reason === "wrong_order" ? "text-amber"
              : "text-red-400"
            }`}>
              {resultTitle}
            </h2>
            <p className="mb-4 text-sm italic text-gray-400">{resultMessage}</p>

            {scanResult.valid ? (
              <p className="text-sm text-gray-500">Entering the archive...</p>
            ) : (
              <div className="flex gap-3">
                <Button onClick={handleRetry} variant="secondary" className="flex-1">Try again</Button>
                <Button onClick={() => router.push("/play")} variant="ghost" className="flex-1">Return</Button>
              </div>
            )}
          </Card>
        )}

        {/* Camera scanner */}
        {!scanResult && !manualMode && (
          <>
            <div className="relative mb-4 w-full max-w-sm overflow-hidden rounded-2xl bg-black">
              {cameraError ? (
                <div className="flex h-80 flex-col items-center justify-center p-6 text-center">
                  <AlertTriangle className="mb-3 h-8 w-8 text-amber" />
                  <p className="text-sm text-gray-400">{cameraError}</p>
                </div>
              ) : (
                <div id="qr-reader" ref={scannerRef} className="h-80 w-full" />
              )}

              {scanning && !cameraError && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-52 w-52">
                    <div className="animate-corner-pulse absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-primary" />
                    <div className="animate-corner-pulse absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-primary" style={{ animationDelay: "0.5s" }} />
                    <div className="animate-corner-pulse absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-primary" style={{ animationDelay: "1s" }} />
                    <div className="animate-corner-pulse absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-primary" style={{ animationDelay: "1.5s" }} />
                  </div>
                </div>
              )}
            </div>

            {processing && (
              <p className="mb-4 animate-pulse text-sm text-primary">Deciphering sigil...</p>
            )}

            <p className="mb-2 text-center text-sm text-gray-300">
              Point your device at <span className="font-medium text-primary">{objectName}</span>
            </p>
            {objectDesc && (
              <p className="mb-6 text-center text-xs text-gray-500">{objectDesc}</p>
            )}
          </>
        )}

        {/* Manual mode */}
        {!scanResult && manualMode && (
          <Card className="mb-6 w-full max-w-sm bg-surface">
            <h2 className="mb-1 text-center font-bold">Enter Staff Code</h2>
            <p className="mb-4 text-center text-sm text-gray-400">
              Enter the object code or staff code
            </p>
            <div className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="OBJ-01"
                maxLength={20}
                className="bg-deep text-center font-mono tracking-widest"
              />
              <Button onClick={handleManualSubmit} disabled={!manualCode.trim() || processing}>OK</Button>
            </div>
            <button
              onClick={() => router.push("/play")}
              className="mt-4 w-full text-center text-xs text-gray-500 hover:text-gray-300"
            >
              Request Curator Assistance
            </button>
          </Card>
        )}

        {/* Mode toggle */}
        {!scanResult && (
          <button
            onClick={() => { setManualMode(!manualMode); setCameraError(null); }}
            className="flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-300"
          >
            {manualMode ? (
              <><QrCode className="h-4 w-4" /> Scan a sigil</>
            ) : (
              <><Keyboard className="h-4 w-4" /> Enter code manually</>
            )}
          </button>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
