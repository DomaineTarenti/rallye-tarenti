import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse, Team } from "@/lib/types";

// POST /api/team — créer une équipe + initialiser la progression
export async function POST(req: NextRequest) {
  const { session_id, name, character } = await req.json();

  if (!session_id || !name) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "session_id et name requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // 1. Create team
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      session_id,
      name,
      character: typeof character === "string" ? character : JSON.stringify(character),
      status: "playing",
    })
    .select()
    .single();

  if (teamError || !team) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: teamError?.message ?? "Erreur création équipe" },
      { status: 500 }
    );
  }

  // 2. Get all objects for session, ordered
  const { data: objects } = await supabase
    .from("objects")
    .select("*")
    .eq("session_id", session_id)
    .order("order");

  // 3. Get all steps for those objects, ordered
  const objectIds = (objects ?? []).map((o) => o.id);
  let steps: Array<Record<string, unknown>> = [];

  if (objectIds.length > 0) {
    const { data: stepsData } = await supabase
      .from("steps")
      .select("*")
      .in("object_id", objectIds)
      .order("order");

    steps = stepsData ?? [];
  }

  // Sort steps by their object order, then step order
  const objectOrderMap = new Map((objects ?? []).map((o) => [o.id, o.order]));
  steps.sort((a, b) => {
    const objOrderA = objectOrderMap.get(a.object_id as string) ?? 0;
    const objOrderB = objectOrderMap.get(b.object_id as string) ?? 0;
    if (objOrderA !== objOrderB) return objOrderA - objOrderB;
    return ((a.order as number) ?? 0) - ((b.order as number) ?? 0);
  });

  // 4. Initialize team_progress for all steps
  let progress: Array<Record<string, unknown>> = [];

  if (steps.length > 0) {
    const progressEntries = steps.map((step, idx) => ({
      team_id: team.id,
      step_id: step.id,
      status: idx === 0 ? "active" : "locked",
    }));

    const { data: progressData } = await supabase
      .from("team_progress")
      .insert(progressEntries)
      .select();

    progress = progressData ?? [];
  }

  return NextResponse.json<ApiResponse>(
    {
      data: { team, objects: objects ?? [], steps, progress },
      error: null,
    },
    { status: 201 }
  );
}
