import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

interface HintResult {
  hint_text: string;
  hints_used: number;
}

// POST /api/hint — demander l'unique indice d'une étape
export async function POST(req: NextRequest) {
  const { team_id, step_id } = await req.json();

  if (!team_id || !step_id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id et step_id requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const [progressRes, stepRes] = await Promise.all([
    supabase.from("team_progress").select("*").eq("team_id", team_id).eq("step_id", step_id).single(),
    supabase.from("steps").select("hint").eq("id", step_id).single(),
  ]);

  if (!progressRes.data || !stepRes.data) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Étape ou progression non trouvée" },
      { status: 404 }
    );
  }

  const progress = progressRes.data;
  const step = stepRes.data;

  // Vérifier si l'indice a déjà été utilisé
  if ((progress.hints_used ?? 0) >= 1) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "L'indice a déjà été utilisé pour cette étape." },
      { status: 400 }
    );
  }

  // Pas d'indice configuré
  if (!step.hint) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Pas d'indice disponible pour cette étape." },
      { status: 404 }
    );
  }

  // Marquer l'indice comme utilisé
  await supabase
    .from("team_progress")
    .update({ hints_used: 1 })
    .eq("team_id", team_id)
    .eq("step_id", step_id);

  const result: HintResult = {
    hint_text: step.hint,
    hints_used: 1,
  };

  return NextResponse.json<ApiResponse<HintResult>>({ data: result, error: null });
}
