import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

const HINT_PENALTIES: Record<string, number> = {
  narratif: 15,
  photo: 25,
  direct: 50,
};

interface HintResult {
  hint_type: "narratif" | "photo" | "direct";
  hint_text: string | null;
  hint_photo_url: string | null;
  hints_used: number;
  penalty: number;
}

// POST /api/hint — request a hint
export async function POST(req: NextRequest) {
  const { team_id, step_id } = await req.json();

  if (!team_id || !step_id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id et step_id requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: progress, error: progError } = await supabase
    .from("team_progress")
    .select("*")
    .eq("team_id", team_id)
    .eq("step_id", step_id)
    .single();

  if (progError || !progress) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Progression introuvable" },
      { status: 404 }
    );
  }

  const { data: step } = await supabase
    .from("steps")
    .select("*")
    .eq("id", step_id)
    .single();

  if (!step) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Step not found" },
      { status: 404 }
    );
  }

  const currentHints = progress.hints_used ?? 0;

  let hintType: "narratif" | "photo" | "direct";
  let hintText: string | null = null;
  let hintPhotoUrl: string | null = null;

  if (currentHints === 0) {
    hintType = "narratif";
    hintText = step.text_narratif
      ? "Read the revelation text carefully — the answer hides within..."
      : "Observe the details around you attentively.";
  } else if (currentHints === 1 && step.photo_indice_url) {
    hintType = "photo";
    hintPhotoUrl = step.photo_indice_url;
    hintText = "Study this image carefully...";
  } else {
    hintType = "direct";
    if (step.answer) {
      const answer = step.answer.trim();
      const reveal =
        answer.length <= 3
          ? answer[0]
          : answer.slice(0, Math.ceil(answer.length / 3));
      hintText = `The answer begins with: "${reveal}..."`;
    } else {
      hintText = "Seek aid from a nearby Guardian.";
    }
  }

  const penalty = HINT_PENALTIES[hintType];
  const newHintsUsed = currentHints + 1;
  const updatedHintTypes = [...(progress.hint_types ?? []), hintType];

  await supabase
    .from("team_progress")
    .update({
      hints_used: newHintsUsed,
      hint_types: updatedHintTypes,
    })
    .eq("team_id", team_id)
    .eq("step_id", step_id);

  const result: HintResult = {
    hint_type: hintType,
    hint_text: hintText,
    hint_photo_url: hintPhotoUrl,
    hints_used: newHintsUsed,
    penalty,
  };

  return NextResponse.json<ApiResponse<HintResult>>({
    data: result,
    error: null,
  });
}
