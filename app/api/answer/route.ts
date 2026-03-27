import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { activateNextStep } from "@/lib/progress";
import type { ApiResponse, AnswerResult } from "@/lib/types";

// POST /api/answer — check a team's answer
export async function POST(req: NextRequest) {
  const { team_id, step_id, answer } = await req.json();

  if (!team_id || !step_id || answer === undefined) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id, step_id et answer requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // 1. Get the step
  const { data: step, error: stepError } = await supabase
    .from("steps")
    .select("*")
    .eq("id", step_id)
    .single();

  if (stepError || !step) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Step not found" },
      { status: 404 }
    );
  }

  // 2. Normalize and compare
  const normalize = (s: string) =>
    s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const correct = normalize(step.answer ?? "") === normalize(String(answer));

  if (correct) {
    // 3. Get hidden_letter
    const { data: objectData } = await supabase
      .from("objects")
      .select("physical_id, hidden_letter")
      .eq("id", step.object_id)
      .single();

    // 4. Mark step as completed
    await supabase
      .from("team_progress")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("team_id", team_id)
      .eq("step_id", step_id);

    // 5. Activate next step using team's object_order
    await activateNextStep(supabase, team_id);

    return NextResponse.json<ApiResponse>({
      data: {
        correct: true,
        message: "Bonne réponse ! Bravo !",
        hidden_letter: objectData?.hidden_letter ?? null,
        physical_id: objectData?.physical_id ?? null,
      },
      error: null,
    });
  }

  // Wrong answer
  try {
    await supabase.rpc("increment_attempts", { p_team_id: team_id, p_step_id: step_id });
  } catch { /* ignore */ }

  const result: AnswerResult = {
    correct: false,
    message: "Ce n'est pas la bonne réponse. Réessayez !",
  };
  return NextResponse.json<ApiResponse<AnswerResult>>({ data: result, error: null });
}
