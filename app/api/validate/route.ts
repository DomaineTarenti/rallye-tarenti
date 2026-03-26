import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse, TeamProgress } from "@/lib/types";

// POST /api/validate — staff valide une épreuve
export async function POST(req: NextRequest) {
  const { team_id, step_id, success } = await req.json();

  if (!team_id || !step_id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id et step_id requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("team_progress")
    .update({
      status: success ? "completed" : "active",
      epreuve_success: success,
      completed_at: success ? new Date().toISOString() : null,
    })
    .eq("team_id", team_id)
    .eq("step_id", step_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<TeamProgress>>({ data, error: null });
}
