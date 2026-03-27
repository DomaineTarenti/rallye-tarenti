"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, QrCode, Keyboard, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button, Card, Input } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import type { ApiResponse, ScanResult } from "@/lib/types";

export default function ScanPage() {
  const router = useRouter();
  const hasHydrated = usePlayerStore((s) => s._hasHydrated);
  const team = usePlayerStore((s) => s.team);
  const session = usePlayerStore((s) => s.session);
  const setCurrentStep = usePlayerStore((s) => s.setCurrentStep);

  const [ready, setReady] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);

  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const processingLock = useRef(false);

  // Wait for hydration
  useEffect(() => {
    if (!hasHydrated) return;
    if (!team || !session) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [hasHydrated, team, session, router]);

  // Initialize camera scanner
  useEffect(() => {
    if (!ready || manualMode || scanResult || cameraError) return;

    let instance: { stop: () => Promise<void> } | null = null;
    let cancelled = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode("qr-reader");
        instance = scanner;
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, disableFlip: false },
          async (decodedText: string) => {
            // Stop scanner immediately on decode
            try { await scanner.stop(); } catch { /* ignore */ }
            instance = null;
            scannerRef.current = null;
            setScannerActive(false);
            handleScanResult(decodedText);
          },
          () => {} // ignore per-frame errors
        );

        if (!cancelled) setScannerActive(true);
      } catch (err) {
        console.error("[SCANNER] Init error:", err);
        if (!cancelled) {
          setCameraError(true);
          setManualMode(true);
        }
      }
    };

    // Small delay to let the DOM mount the #qr-reader div
    const timer = setTimeout(startScanner, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (instance) {
        instance.stop().catch(() => {});
        instance = null;
      }
      scannerRef.current = null;
    };
  }, [ready, manualMode, scanResult, cameraError]);

  async function handleScanResult(code: string) {
    if (processingLock.current) return;
    processingLock.current = true;
    setProcessing(true);

    const state = usePlayerStore.getState();
    const t = state.team;
    const s = state.session;

    console.log("[SCAN] code:", code, "team:", t?.id, "session:", s?.id);

    if (!t || !s) {
      setScanResult({ valid: false, reason: "unknown", message: "Session expired. Please rejoin." });
      processingLock.current = false;
      setProcessing(false);
      return;
    }

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code_id: code, team_id: t.id, session_id: s.id }),
      });

      const json = await res.json();
      console.log("[SCAN] Response:", JSON.stringify(json));

      const result: ScanResult = json.data ?? json;

      if (!result || result.valid === undefined) {
        setScanResult({ valid: false, reason: "unknown", message: json.error ?? "Server error" });
        processingLock.current = false;
        setProcessing(false);
        return;
      }

      setScanResult(result);

      if (result.valid && result.step) {
        setCurrentStep(result.step);
        setTimeout(() => router.push("/play"), 1000);
        return; // don't unlock — navigating away
      }
    } catch (err) {
      console.error("[SCAN] Fetch error:", err);
      setScanResult({ valid: false, reason: "unknown", message: "Connection error." });
    }

    processingLock.current = false;
    setProcessing(false);
  }

  // Loading
  if (!ready) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-deep">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  function handleRetry() {
    setScanResult(null);
    setManualCode("");
    processingLock.current = false;
  }

  // ── Result icons ──
  const resultIcon = scanResult?.valid
    ? <CheckCircle2 className="h-14 w-14 text-green-400" />
    : scanResult?.reason === "wrong_order"
    ? <AlertTriangle className="h-14 w-14 text-amber" />
    : <XCircle className="h-14 w-14 text-red-400" />;

  const resultTitle = scanResult?.valid
    ? "Artifact Found!"
    : scanResult?.reason === "wrong_order" ? "Wrong Path"
    : scanResult?.reason === "already_scanned" ? "Already Claimed"
    : "Unknown Code";

  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.push("/play")}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-gray-400"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Scan</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4">

        {/* ── Result ── */}
        {scanResult && (
          <Card className="mb-6 w-full max-w-sm bg-surface text-center">
            <div className="mb-3 flex justify-center">{resultIcon}</div>
            <h2 className={`mb-1 text-lg font-bold ${scanResult.valid ? "text-green-400" : "text-red-400"}`}>
              {resultTitle}
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              {scanResult.valid ? "Loading the riddle..." : (scanResult.message ?? "Try again.")}
            </p>
            {!scanResult.valid && (
              <div className="flex gap-3">
                <Button onClick={handleRetry} variant="secondary" className="flex-1">Try again</Button>
                <Button onClick={() => router.push("/play")} variant="ghost" className="flex-1">Return</Button>
              </div>
            )}
          </Card>
        )}

        {/* ── Camera scanner ── */}
        {!scanResult && !manualMode && (
          <>
            <div className="relative mb-4 w-full max-w-sm overflow-hidden rounded-2xl bg-black">
              <div id="qr-reader" style={{ width: "100%", minHeight: 300 }} />

              {/* Animated corners overlay */}
              {scannerActive && (
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
              <p className="mb-3 animate-pulse text-sm text-primary">Checking...</p>
            )}

            <p className="mb-4 text-center text-sm text-gray-400">
              Point at the artifact QR code
            </p>
          </>
        )}

        {/* ── Manual mode ── */}
        {!scanResult && manualMode && (
          <Card className="mb-6 w-full max-w-sm bg-surface">
            <h2 className="mb-1 text-center font-bold">Enter Code</h2>
            <p className="mb-3 text-center text-xs text-gray-500">
              {cameraError ? "Camera unavailable — enter code manually" : "Type the code printed on the artifact"}
            </p>
            <div className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleScanResult(manualCode.trim().toUpperCase())}
                placeholder="OBJ-01"
                maxLength={20}
                className="bg-deep text-center font-mono tracking-widest"
              />
              <Button
                onClick={() => handleScanResult(manualCode.trim().toUpperCase())}
                disabled={!manualCode.trim() || processing}
              >
                OK
              </Button>
            </div>
          </Card>
        )}

        {/* Mode toggle */}
        {!scanResult && (
          <button
            onClick={() => { setManualMode(!manualMode); setCameraError(false); }}
            className="mt-2 flex items-center gap-2 text-sm text-gray-500"
          >
            {manualMode
              ? <><QrCode className="h-4 w-4" /> Use camera</>
              : <><Keyboard className="h-4 w-4" /> Enter manually</>
            }
          </button>
        )}
      </div>
    </main>
  );
}
