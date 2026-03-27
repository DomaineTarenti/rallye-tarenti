import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCachedScan, setCachedScan } from "@/lib/scan-cache";
import { activateNextStep } from "@/lib/progress";
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

    const scannedCode = qr_code_id.trim().toUpperCase();

    const rl = checkRateLimit(`scan:${team_id}`);
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: "Too many attempts. Wait a moment." },
        { status: 429 }
      );
    }

    const cached = getCachedScan(scannedCode, team_id);
    if (cached) {
      return NextResponse.json<ApiResponse<ScanResult>>({ data: cached as ScanResult, error: null });
    }

    const supabase = createServerClient();

    // 1. Get the team (need object_order + session_id)
    const { data: team } = await supabase
      .from("teams")
      .select("id, session_id, object_order, status")
      .eq("id", team_id)
      .single();

    if (!team) {
      console.log("[SCAN] Team not found:", team_id);
      return json({ valid: false, reason: "unknown", message: "Team not found." });
    }

    const resolvedSessionId = session_id || team.session_id;
    console.log("[SCAN] Looking for physical_id:", scannedCode, "in session:", resolvedSessionId);

    // 2a. Check if this is a staff validation code (4 digits)
    if (/^\d{4}$/.test(scannedCode)) {
      console.log("[SCAN] Detected 4-digit staff code:", scannedCode);
      const { data: staffMember } = await supabase
        .from("staff_members")
        .select("id, name, assigned_step_id, validation_code")
        .eq("session_id", resolvedSessionId)
        .eq("validation_code", scannedCode)
        .single();

      if (staffMember && staffMember.assigned_step_id) {
        // Staff code valid — mark the epreuve step as completed
        console.log("[SCAN] Staff code match:", staffMember.name, "→ step", staffMember.assigned_step_id);

        // Check this team has this step as active
        const { data: progress } = await supabase
          .from("team_progress")
          .select("*")
          .eq("team_id", team_id)
          .eq("step_id", staffMember.assigned_step_id)
          .single();

        if (progress && progress.status === "active") {
          // Validate the epreuve
          await supabase
            .from("team_progress")
            .update({ status: "completed", epreuve_success: true, completed_at: new Date().toISOString() })
            .eq("id", progress.id);

          // Activate next step using team's object_order
          await activateNextStep(supabase, team_id);

          // Get the step data to return
          const { data: step } = await supabase
            .from("steps")
            .select("*")
            .eq("id", staffMember.assigned_step_id)
            .single();

          const { data: obj } = await supabase
            .from("objects")
            .select("*")
            .eq("id", step?.object_id)
            .single();

          const result: ScanResult = { valid: true, step, object: obj, message: `Validated by ${staffMember.name}!` };
          return json(result);
        }

        // Step exists but not active for this team
        const result: ScanResult = { valid: false, reason: "wrong_order", message: "This challenge is not your current step." };
        return json(result);
      }
      // Not a valid staff code — fall through to physical_id lookup
    }

    // 2b. Find object by physical_id within the session
    let scannedObject = await findObject(supabase, scannedCode, resolvedSessionId);

    if (!scannedObject) {
      console.log("[SCAN] Object not found for", scannedCode);
      const result: ScanResult = { valid: false, reason: "unknown", message: "This sigil is unrecognized." };
      setCachedScan(scannedCode, team_id, result);
      return json(result);
    }

    console.log("[SCAN] Object found:", scannedObject.name, "id:", scannedObject.id);

    // 3. Check existing progress
    const { data: allProgress } = await supabase
      .from("team_progress")
      .select("*")
      .eq("team_id", team_id);

    const progressCount = allProgress?.length ?? 0;
    console.log("[SCAN] Progress rows:", progressCount, "object_order length:", team.object_order?.length ?? 0);

    // 4. If no progress exists, auto-initialize it now
    if (progressCount === 0) {
      console.log("[SCAN] No progress — auto-initializing for team", team_id);
      const initialized = await initializeProgress(supabase, team_id, resolvedSessionId, team.object_order);
      if (!initialized) {
        return json({ valid: false, reason: "unknown", message: "Could not initialize game progress. Contact an organiser." });
      }
      // Re-fetch progress after initialization
      const { data: freshProgress } = await supabase
        .from("team_progress")
        .select("*")
        .eq("team_id", team_id);

      return processMatch(supabase, scannedObject, team_id, scannedCode, freshProgress ?? []);
    }

    return processMatch(supabase, scannedObject, team_id, scannedCode, allProgress ?? []);
  } catch (err) {
    console.error("[SCAN] Uncaught error:", err);
    return json(
      { valid: false, reason: "unknown", message: err instanceof Error ? err.message : "Server error" },
      500
    );
  }
}

// ── Helpers ──

function json(result: ScanResult, status = 200) {
  return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null }, { status });
}

async function findObject(supabase: ReturnType<typeof createServerClient>, code: string, sessionId: string) {
  // Try physical_id first
  const { data: obj } = await supabase
    .from("objects")
    .select("*")
    .eq("physical_id", code)
    .eq("session_id", sessionId)
    .single();

  if (obj) return obj;

  // Fallback: qr_code_id
  const { data: fallback } = await supabase
    .from("objects")
    .select("*")
    .eq("qr_code_id", code)
    .eq("session_id", sessionId)
    .single();

  return fallback;
}

async function initializeProgress(
  supabase: ReturnType<typeof createServerClient>,
  teamId: string,
  sessionId: string,
  objectOrder: string[] | null,
) {
  // Get steps for the session's objects
  const { data: objects } = await supabase
    .from("objects")
    .select("id")
    .eq("session_id", sessionId)
    .order("order");

  const objectIds = (objects ?? []).map((o) => o.id);
  if (objectIds.length === 0) return false;

  const { data: steps } = await supabase
    .from("steps")
    .select("id, object_id, order")
    .in("object_id", objectIds)
    .order("order");

  if (!steps || steps.length === 0) return false;

  // Sort steps by the team's object_order (if available)
  const sortedSteps = [...steps];
  if (objectOrder && objectOrder.length > 0) {
    const orderIdx = new Map(objectOrder.map((id, idx) => [id, idx]));
    sortedSteps.sort((a, b) => {
      const oa = orderIdx.get(a.object_id) ?? 999;
      const ob = orderIdx.get(b.object_id) ?? 999;
      if (oa !== ob) return oa - ob;
      return a.order - b.order;
    });
  }

  const progressEntries = sortedSteps.map((step, idx) => ({
    team_id: teamId,
    step_id: step.id,
    status: idx === 0 ? "active" : "locked",
  }));

  const { error } = await supabase.from("team_progress").insert(progressEntries);
  if (error) {
    console.error("[SCAN] Failed to initialize progress:", error.message);
    return false;
  }

  console.log("[SCAN] Initialized", progressEntries.length, "progress rows");
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMatch(
  supabase: ReturnType<typeof createServerClient>,
  scannedObject: any,
  team_id: string,
  scannedCode: string,
  allProgress: Array<Record<string, unknown>>,
) {
  const activeProgress = allProgress.find((p) => p.status === "active");
  const completedCount = allProgress.filter((p) => p.status === "completed").length;
  const totalCount = allProgress.length;

  console.log("[SCAN] Active progress:", activeProgress ? `step ${activeProgress.step_id}` : "NONE",
    `(${completedCount}/${totalCount} completed)`);

  if (!activeProgress) {
    // Only "quest_complete" if we actually have progress AND all are completed
    if (totalCount > 0 && completedCount >= totalCount) {
      const result: ScanResult = { valid: false, reason: "quest_complete", message: "You have completed all chapters!" };
      setCachedScan(scannedCode, team_id, result);
      return json(result);
    }
    // Otherwise something is wrong — there should be an active step
    console.log("[SCAN] No active progress but quest not complete — possible stuck state");
    const result: ScanResult = { valid: false, reason: "unknown", message: "Game state error. Contact an organiser." };
    return json(result);
  }

  // Get the active step
  const { data: activeStep } = await supabase
    .from("steps")
    .select("*")
    .eq("id", activeProgress.step_id as string)
    .single();

  if (!activeStep) {
    console.log("[SCAN] Active step not found for progress:", activeProgress.step_id);
    return json({ valid: false, reason: "unknown", message: "Internal error. Contact an organiser." });
  }

  console.log("[SCAN] Active step object_id:", activeStep.object_id, "Scanned object id:", scannedObject.id);

  // Check match
  if (activeStep.object_id !== scannedObject.id) {
    // Check if already scanned
    const { data: objectSteps } = await supabase
      .from("steps")
      .select("id")
      .eq("object_id", scannedObject.id as string);

    const stepIds = (objectSteps ?? []).map((s: { id: string }) => s.id);

    if (stepIds.length > 0) {
      const matchedProgress = allProgress.filter(
        (p) => stepIds.includes(p.step_id as string) && p.status === "completed"
      );
      if (matchedProgress.length === stepIds.length) {
        const result: ScanResult = { valid: false, reason: "already_scanned", message: "You have already claimed this artifact." };
        setCachedScan(scannedCode, team_id, result);
        return json(result);
      }
    }

    const result: ScanResult = { valid: false, reason: "wrong_order", message: "This artifact is not yet your destiny... your path leads elsewhere for now." };
    setCachedScan(scannedCode, team_id, result);
    return json(result);
  }

  // Valid scan
  console.log("[SCAN] VALID match for", scannedObject.name);
  const result: ScanResult = { valid: true, step: activeStep, object: scannedObject };
  setCachedScan(scannedCode, team_id, result);
  return json(result);
}
