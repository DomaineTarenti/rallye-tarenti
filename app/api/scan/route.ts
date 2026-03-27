import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCachedScan, setCachedScan } from "@/lib/scan-cache";
import type { ApiResponse, ScanResult } from "@/lib/types";

// POST /api/scan — process a QR scan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { qr_code_id, team_id, session_id } = body;

    console.log("[SCAN] Body:", { qr_code_id, team_id, session_id });

    if (!qr_code_id || !team_id) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: "qr_code_id et team_id requis" },
        { status: 400 }
      );
    }

    // Normalize: the physical QR code contains the physical_id (e.g. "OBJ-01")
    const scannedCode = qr_code_id.trim().toUpperCase();

    // ── Rate limit: 10 scans/min per team ──
    const rl = checkRateLimit(`scan:${team_id}`);
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: "Too many attempts. Wait a moment." },
        { status: 429 }
      );
    }

    // ── Cache check: same scan within 30s returns cached result ──
    const cached = getCachedScan(scannedCode, team_id);
    if (cached) {
      return NextResponse.json<ApiResponse<ScanResult>>({
        data: cached as ScanResult,
        error: null,
      });
    }

    const supabase = createServerClient();

    // 1. Resolve session_id — prefer param, fallback to team lookup
    let resolvedSessionId = session_id;
    if (!resolvedSessionId) {
      const { data: team } = await supabase
        .from("teams")
        .select("session_id")
        .eq("id", team_id)
        .single();

      if (!team) {
        console.log("[SCAN] Team not found:", team_id);
        const result: ScanResult = { valid: false, reason: "unknown", message: "Team not found." };
        return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
      }
      resolvedSessionId = team.session_id;
    }

    console.log("[SCAN] Looking for physical_id:", scannedCode, "in session:", resolvedSessionId);

    // 2. Find object by physical_id within the session
    const { data: scannedObject, error: objError } = await supabase
      .from("objects")
      .select("*")
      .eq("physical_id", scannedCode)
      .eq("session_id", resolvedSessionId)
      .single();

    console.log("[SCAN] Object found:", scannedObject?.name ?? "NONE", "Error:", objError?.message ?? "none");

    if (objError || !scannedObject) {
      // Fallback: try by qr_code_id for backward compatibility
      const { data: fallbackObj } = await supabase
        .from("objects")
        .select("*")
        .eq("qr_code_id", scannedCode)
        .eq("session_id", resolvedSessionId)
        .single();

      if (!fallbackObj) {
        const result: ScanResult = {
          valid: false,
          reason: "unknown",
          message: "This sigil is unrecognized.",
        };
        setCachedScan(scannedCode, team_id, result);
        return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
      }

      console.log("[SCAN] Fallback match by qr_code_id:", fallbackObj.name);
      return processMatch(supabase, fallbackObj, team_id, scannedCode);
    }

    return processMatch(supabase, scannedObject, team_id, scannedCode);
  } catch (err) {
    console.error("[SCAN] Uncaught error:", err);
    const result: ScanResult = {
      valid: false,
      reason: "unknown",
      message: err instanceof Error ? err.message : "Server error",
    };
    return NextResponse.json<ApiResponse<ScanResult>>(
      { data: result, error: null },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMatch(
  supabase: ReturnType<typeof createServerClient>,
  scannedObject: any,
  team_id: string,
  scannedCode: string,
) {
  // Get team's current active progress
  const { data: activeProgressList } = await supabase
    .from("team_progress")
    .select("*")
    .eq("team_id", team_id)
    .eq("status", "active");

  const activeProgress = activeProgressList?.[0];

  console.log("[SCAN] Active progress:", activeProgress ? `step ${activeProgress.step_id}` : "NONE");

  if (!activeProgress) {
    const result: ScanResult = {
      valid: false,
      reason: "quest_complete",
      message: "You have completed all chapters!",
    };
    setCachedScan(scannedCode, team_id, result);
    return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
  }

  // Get the active step
  const { data: activeStep } = await supabase
    .from("steps")
    .select("*")
    .eq("id", activeProgress.step_id)
    .single();

  if (!activeStep) {
    console.log("[SCAN] Active step not found for progress:", activeProgress.step_id);
    const result: ScanResult = {
      valid: false,
      reason: "unknown",
      message: "Internal error. Contact an organiser.",
    };
    return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
  }

  console.log("[SCAN] Active step object_id:", activeStep.object_id, "Scanned object id:", scannedObject.id);

  // Check match
  if (activeStep.object_id !== scannedObject.id) {
    const { data: objectSteps } = await supabase
      .from("steps")
      .select("id")
      .eq("object_id", scannedObject.id as string);

    const stepIds = (objectSteps ?? []).map((s: { id: string }) => s.id);

    if (stepIds.length > 0) {
      const { data: completedCount } = await supabase
        .from("team_progress")
        .select("id")
        .eq("team_id", team_id)
        .in("step_id", stepIds)
        .eq("status", "completed");

      if (completedCount && completedCount.length === stepIds.length) {
        const result: ScanResult = {
          valid: false,
          reason: "already_scanned",
          message: "You have already claimed this artifact.",
        };
        setCachedScan(scannedCode, team_id, result);
        return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
      }
    }

    const result: ScanResult = {
      valid: false,
      reason: "wrong_order",
      message: "This artifact is not yet your destiny... your path leads elsewhere for now.",
    };
    setCachedScan(scannedCode, team_id, result);
    return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
  }

  // Valid scan
  console.log("[SCAN] VALID match for", scannedObject.name);
  const result: ScanResult = {
    valid: true,
    step: activeStep,
    object: scannedObject,
  };
  setCachedScan(scannedCode, team_id, result);
  return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
}
