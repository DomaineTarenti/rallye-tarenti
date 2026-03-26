import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse, AnswerResult } from "@/lib/types";

// POST /api/answer — vérifier la réponse d'une équipe
export async function POST(req: NextRequest) {
  const { team_id, step_id, answer } = await req.json();

  if (!team_id || !step_id || answer === undefined) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id, step_id et answer requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // 1. Get the step to check the answer
  const { data: step, error: stepError } = await supabase
    .from("steps")
    .select("*")
    .eq("id", step_id)
    .single();

  if (stepError || !step) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Étape introuvable" },
      { status: 404 }
    );
  }

  // 2. Normalize and compare answers
  const normalize = (s: string) =>
    s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const correct = normalize(step.answer ?? "") === normalize(String(answer));

  if (correct) {
    // 3. Mark step as completed
    await supabase
      .from("team_progress")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("team_id", team_id)
      .eq("step_id", step_id);

    // 4. Activate next step (find next locked step by order)
    // Get all progress for this team, ordered by step order
    const { data: allProgress } = await supabase
      .from("team_progress")
      .select("*")
      .eq("team_id", team_id);

    // Get all steps for ordering
    const stepIds = (allProgress ?? []).map((p) => p.step_id);
    const { data: allSteps } = await supabase
      .from("steps")
      .select("id, order, object_id")
      .in("id", stepIds);

    // Find next locked step by order
    const stepOrderMap = new Map(
      (allSteps ?? []).map((s) => [s.id, s.order])
    );
    const lockedProgress = (allProgress ?? [])
      .filter((p) => p.status === "locked")
      .sort(
        (a, b) =>
          (stepOrderMap.get(a.step_id) ?? 0) -
          (stepOrderMap.get(b.step_id) ?? 0)
      );

    if (lockedProgress.length > 0) {
      await supabase
        .from("team_progress")
        .update({ status: "active" })
        .eq("id", lockedProgress[0].id);
    } else {
      // All steps completed — mark team as finished + locked
      await supabase
        .from("teams")
        .update({ status: "finished", locked: true })
        .eq("id", team_id);
    }

    const result: AnswerResult = {
      correct: true,
      message: "Bonne réponse ! Bravo !",
    };
    return NextResponse.json<ApiResponse<AnswerResult>>({
      data: result,
      error: null,
    });
  }

  // Wrong answer — increment attempts (best-effort, RPC may not exist)
  try {
    await supabase.rpc("increment_attempts", { p_team_id: team_id, p_step_id: step_id });
  } catch {
    // Silently ignore if RPC doesn't exist
  }

  const result: AnswerResult = {
    correct: false,
    message: "Ce n'est pas la bonne réponse. Réessayez !",
  };
  return NextResponse.json<ApiResponse<AnswerResult>>({
    data: result,
    error: null,
  });
}
