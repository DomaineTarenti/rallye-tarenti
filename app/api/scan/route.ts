import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCachedScan, setCachedScan } from "@/lib/scan-cache";
import type { ApiResponse, ScanResult } from "@/lib/types";

// POST /api/scan — process a QR scan
export async function POST(req: NextRequest) {
  const { qr_code_id, team_id } = await req.json();

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

  // 1. Get the team to find the session_id
  const { data: team } = await supabase
    .from("teams")
    .select("session_id")
    .eq("id", team_id)
    .single();

  if (!team) {
    const result: ScanResult = { valid: false, reason: "unknown", message: "Team not found." };
    return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
  }

  // 2. Find object by physical_id within the team's session
  const { data: scannedObject } = await supabase
    .from("objects")
    .select("*")
    .eq("physical_id", scannedCode)
    .eq("session_id", team.session_id)
    .single();

  if (!scannedObject) {
    // Fallback: try by qr_code_id for backward compatibility
    const { data: fallbackObj } = await supabase
      .from("objects")
      .select("*")
      .eq("qr_code_id", scannedCode)
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

    // Use the fallback object
    return processMatch(supabase, fallbackObj, team_id, scannedCode);
  }

  return processMatch(supabase, scannedObject, team_id, scannedCode);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMatch(
  supabase: ReturnType<typeof createServerClient>,
  scannedObject: any,
  team_id: string,
  scannedCode: string,
) {
  // 2. Get team's current active progress
  const { data: activeProgressList } = await supabase
    .from("team_progress")
    .select("*")
    .eq("team_id", team_id)
    .eq("status", "active");

  const activeProgress = activeProgressList?.[0];

  if (!activeProgress) {
    const result: ScanResult = {
      valid: false,
      reason: "quest_complete",
      message: "You have completed all chapters!",
    };
    setCachedScan(scannedCode, team_id, result);
    return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
  }

  // 3. Get the active step
  const { data: activeStep } = await supabase
    .from("steps")
    .select("*")
    .eq("id", activeProgress.step_id)
    .single();

  if (!activeStep) {
    const result: ScanResult = {
      valid: false,
      reason: "unknown",
      message: "Internal error. Contact an organiser.",
    };
    return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
  }

  // 4. Check match
  if (activeStep.object_id !== scannedObject.id) {
    const { data: objectSteps } = await supabase
      .from("steps")
      .select("id")
      .eq("object_id", scannedObject.id as string);

    const stepIds = (objectSteps ?? []).map((s) => s.id);

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

  // 5. Valid scan
  const result: ScanResult = {
    valid: true,
    step: activeStep,
    object: scannedObject,
  };
  setCachedScan(scannedCode, team_id, result);
  return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
}
