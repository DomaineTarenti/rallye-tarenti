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

  // Fetch all in parallel
  const [teamRes, objectsRes, progressRes, scoringRes] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).single(),
    supabase
      .from("objects")
      .select("*")
      .eq("session_id", sessionId)
      .order("order"),
    supabase.from("team_progress").select("*").eq("team_id", teamId),
    supabase
      .from("scoring_config")
      .select("*")
      .eq("session_id", sessionId)
      .single(),
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

  // Sort steps by object order then step order
  const objectOrderMap = new Map(objects.map((o) => [o.id, o.order]));
  steps.sort((a, b) => {
    const oa = objectOrderMap.get(a.object_id as string) ?? 0;
    const ob = objectOrderMap.get(b.object_id as string) ?? 0;
    if (oa !== ob) return oa - ob;
    return ((a.order as number) ?? 0) - ((b.order as number) ?? 0);
  });

  // Calculate score
  const progress = progressRes.data ?? [];
  const scoring = scoringRes.data;
  const penaltyPerHint = scoring?.penalty_per_hint ?? 15;
  const baseScore = scoring?.base_score ?? 1000;
  const totalHints = progress.reduce(
    (sum, p) => sum + (p.hints_used ?? 0),
    0
  );
  const score = Math.max(0, baseScore - totalHints * penaltyPerHint);

  return NextResponse.json<ApiResponse>({
    data: {
      team: teamRes.data,
      objects,
      steps,
      progress,
      score,
    },
    error: null,
  });
}
