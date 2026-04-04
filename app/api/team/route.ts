import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// GET /api/team?access_code=FAM01 — récupérer une équipe par son code (recovery)
export async function GET(req: NextRequest) {
  const accessCode = req.nextUrl.searchParams.get("access_code");

  if (!accessCode) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "access_code requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: team, error } = await supabase
    .from("teams")
    .select("*, sessions(*)")
    .eq("access_code", accessCode.toUpperCase().trim())
    .single();

  if (error || !team) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Équipe non trouvée." },
      { status: 404 }
    );
  }

  const session = team.sessions;

  // Charger les objets et steps
  const { data: objects } = await supabase
    .from("objects")
    .select("*")
    .eq("session_id", team.session_id)
    .order("order");

  const objectIds = (objects ?? []).map((o) => o.id);
  let steps: Array<Record<string, unknown>> = [];
  if (objectIds.length > 0) {
    const { data } = await supabase.from("steps").select("*").in("object_id", objectIds).order("order");
    steps = data ?? [];
  }

  const objectOrderMap = new Map((objects ?? []).map((o) => [o.id, o.order]));
  steps.sort((a, b) => {
    const oa = objectOrderMap.get(a.object_id as string) ?? 0;
    const ob = objectOrderMap.get(b.object_id as string) ?? 0;
    return oa - ob;
  });

  const { data: progress } = await supabase.from("team_progress").select("*").eq("team_id", team.id);

  return NextResponse.json<ApiResponse>({
    data: {
      team: { ...team, sessions: undefined },
      session,
      objects: objects ?? [],
      steps,
      progress: progress ?? [],
    },
    error: null,
  });
}
