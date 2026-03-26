import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse, ScanResult } from "@/lib/types";

// POST /api/scan — traiter un scan QR
export async function POST(req: NextRequest) {
  const { qr_code_id, team_id } = await req.json();

  if (!qr_code_id || !team_id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "qr_code_id et team_id requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // 1. Find object by QR code
  const { data: scannedObject, error: objError } = await supabase
    .from("objects")
    .select("*")
    .eq("qr_code_id", qr_code_id)
    .single();

  if (objError || !scannedObject) {
    const result: ScanResult = {
      valid: false,
      reason: "unknown",
      message: "QR code non reconnu. Essayez un autre code.",
    };
    return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
  }

  // 2. Get team's current active progress entry
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
      message: "Bravo ! Vous avez terminé toutes les étapes !",
    };
    return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
  }

  // 3. Get the active step to find its object_id
  const { data: activeStep } = await supabase
    .from("steps")
    .select("*")
    .eq("id", activeProgress.step_id)
    .single();

  if (!activeStep) {
    const result: ScanResult = {
      valid: false,
      reason: "unknown",
      message: "Erreur interne. Contactez un organisateur.",
    };
    return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
  }

  // 4. Check if scanned object matches current step's object
  if (activeStep.object_id !== scannedObject.id) {
    // Check if this object's steps are already completed (already_scanned)
    const { data: objectSteps } = await supabase
      .from("steps")
      .select("id")
      .eq("object_id", scannedObject.id);

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
          message: "Vous avez déjà exploré cet objet ! Cherchez le suivant.",
        };
        return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
      }
    }

    const result: ScanResult = {
      valid: false,
      reason: "wrong_order",
      message: "Ce n'est pas le bon objet... Suivez les indices pour trouver le bon !",
    };
    return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
  }

  // 5. Valid scan — return step data
  const result: ScanResult = {
    valid: true,
    step: activeStep,
    object: scannedObject,
  };
  return NextResponse.json<ApiResponse<ScanResult>>({ data: result, error: null });
}
