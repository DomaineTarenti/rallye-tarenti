import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// POST /api/admin/reset-team — remet une équipe à zéro (waiting)
// Supprime progression, messages et photos (enregistrements DB)
export async function POST(req: NextRequest) {
  const { team_id } = await req.json();

  if (!team_id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Récupérer le code d'accès pour remettre le nom par défaut
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("access_code")
    .eq("id", team_id)
    .single();

  if (teamErr || !team) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Équipe introuvable" },
      { status: 404 }
    );
  }

  // Supprimer progression, messages, photos (en parallèle)
  await Promise.all([
    supabase.from("team_progress").delete().eq("team_id", team_id),
    supabase.from("team_messages").delete().eq("team_id", team_id),
    supabase.from("photos").delete().eq("team_id", team_id),
  ]);

  // Remettre l'équipe à zéro
  const defaultName = team.access_code ?? "Équipe";
  const { data: updated, error: updateErr } = await supabase
    .from("teams")
    .update({
      status: "waiting",
      name: defaultName,
      started_at: null,
      completion_time: null,
    })
    .eq("id", team_id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: updateErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ data: updated, error: null });
}
