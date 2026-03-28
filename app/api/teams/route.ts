import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// GET /api/teams?session_id=xxx — list teams with progress for a session
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "session_id required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const [teamsRes, stepsRes] = await Promise.all([
    supabase
      .from("teams")
      .select("*, team_progress(*)")
      .eq("session_id", sessionId)
      .order("created_at"),
    supabase
      .from("steps")
      .select("id, order, object_id")
      .in(
        "object_id",
        (
          await supabase
            .from("objects")
            .select("id")
            .eq("session_id", sessionId)
        ).data?.map((o) => o.id) ?? []
      )
      .order("order"),
  ]);

  const teams = teamsRes.data ?? [];
  const totalSteps = stepsRes.data?.length ?? 0;

  // Enrich teams with progress info
  const enriched = teams.map((team) => {
    const progress = Array.isArray(team.team_progress)
      ? team.team_progress
      : [];
    const completed = progress.filter(
      (p: Record<string, unknown>) => p.status === "completed"
    ).length;
    const active = progress.find(
      (p: Record<string, unknown>) => p.status === "active"
    );
    const hintsUsed = progress.reduce(
      (sum: number, p: Record<string, unknown>) =>
        sum + ((p.hints_used as number) ?? 0),
      0
    );

    return {
      ...team,
      team_progress: undefined,
      completed_steps: completed,
      total_steps: totalSteps,
      current_step: active ? progress.indexOf(active) + 1 : completed,
      hints_used: hintsUsed,
      elapsed_seconds: team.started_at
        ? Math.floor(
            (Date.now() - new Date(team.started_at).getTime()) / 1000
          )
        : 0,
      started_at: team.started_at ?? null,
    };
  });

  return NextResponse.json<ApiResponse>({ data: enriched, error: null });
}
