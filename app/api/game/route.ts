import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// GET /api/game?team_id=xxx&session_id=yyy — charger l'état du jeu
export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("team_id");
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!teamId || !sessionId) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id et session_id requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Récupérer tout en parallèle
  const [teamRes, objectsRes, progressRes] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).single(),
    supabase.from("objects").select("*").eq("session_id", sessionId).order("order"),
    supabase.from("team_progress").select("*").eq("team_id", teamId),
  ]);

  const objects = objectsRes.data ?? [];
  const objectIds = objects.map((o) => o.id);

  let steps: Array<Record<string, unknown>> = [];
  if (objectIds.length > 0) {
    const { data } = await supabase
      .from("steps")
      .select("*")
      .in("object_id", objectIds)
      .order("order");
    steps = data ?? [];
  }

  // Trier les steps par ordre d'objet (fixe)
  const objectOrderMap = new Map(objects.map((o) => [o.id, o.order]));
  steps.sort((a, b) => {
    const oa = objectOrderMap.get(a.object_id as string) ?? 0;
    const ob = objectOrderMap.get(b.object_id as string) ?? 0;
    return oa - ob;
  });

  return NextResponse.json<ApiResponse>({
    data: {
      team: teamRes.data,
      objects,
      steps,
      progress: progressRes.data ?? [],
    },
    error: null,
  });
}
