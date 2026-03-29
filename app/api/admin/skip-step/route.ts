import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { activateNextStep } from "@/lib/progress";
import type { ApiResponse } from "@/lib/types";

// POST /api/admin/skip-step — complete the team's current active step
export async function POST(req: NextRequest) {
  const { team_id } = await req.json();

  if (!team_id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Find the team's current active step
  const { data: activeProgress } = await supabase
    .from("team_progress")
    .select("id, step_id, status")
    .eq("team_id", team_id)
    .eq("status", "active")
    .single();

  if (!activeProgress) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "No active step found for this team" },
      { status: 404 }
    );
  }

  // Mark it as completed
  await supabase
    .from("team_progress")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      epreuve_success: true,
    })
    .eq("id", activeProgress.id);

  // Activate the next step
  await activateNextStep(supabase, team_id);

  return NextResponse.json<ApiResponse>({
    data: { skipped: true, step_id: activeProgress.step_id },
    error: null,
  });
}
