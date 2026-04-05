import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { activateNextStep } from "@/lib/progress";
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

  // 1. Récupérer la question
  const { data: step, error: stepError } = await supabase
    .from("steps")
    .select("*")
    .eq("id", step_id)
    .single();

  if (stepError || !step) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Étape non trouvée" },
      { status: 404 }
    );
  }

  // 2. Normaliser et comparer (insensible à la casse, aux accents, espaces)
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // enlever les accents
      .replace(/[^a-z0-9]/g, "");     // garder seulement alphanumérique

  const correct = normalize(step.answer ?? "") === normalize(String(answer));

  if (correct) {
    // 3. Marquer comme complétée uniquement si encore active (idempotence + race condition)
    const { data: progressUpdate } = await supabase
      .from("team_progress")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("team_id", team_id)
      .eq("step_id", step_id)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    // 4. Activer l'étape suivante seulement si c'est nous qui venons de compléter
    if (progressUpdate) {
      await activateNextStep(supabase, team_id);
    }

    const result: AnswerResult = {
      correct: true,
      message: "Bonne réponse ! Bravo !",
      fun_fact: step.fun_fact ?? "",
    };

    return NextResponse.json<ApiResponse<AnswerResult>>({ data: result, error: null });
  }

  // Mauvaise réponse
  const result: AnswerResult = {
    correct: false,
    message: "Ce n'est pas la bonne réponse. Réessayez !",
  };
  return NextResponse.json<ApiResponse<AnswerResult>>({ data: result, error: null });
}
