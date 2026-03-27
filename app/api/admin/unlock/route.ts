import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { activateNextStep } from "@/lib/progress";
import type { ApiResponse } from "@/lib/types";

// POST /api/admin/unlock — unlock/activate a specific step for a team
export async function POST(req: NextRequest) {
  const { team_id, step_id } = await req.json();

  if (!team_id || !step_id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id and step_id required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("team_progress")
    .select("id, status")
    .eq("team_id", team_id)
    .eq("step_id", step_id)
    .single();

  if (existing) {
    const newStatus = existing.status === "active" ? "completed" : "active";
    const { data, error } = await supabase
      .from("team_progress")
      .update({
        status: newStatus,
        ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiResponse>({ data: null, error: error.message }, { status: 500 });
    }

    // If completed, activate next step using team's object_order
    if (newStatus === "completed") {
      await activateNextStep(supabase, team_id);
    }

    return NextResponse.json<ApiResponse>({ data, error: null });
  }

  const { data, error } = await supabase
    .from("team_progress")
    .insert({ team_id, step_id, status: "active" })
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiResponse>({ data: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json<ApiResponse>({ data, error: null }, { status: 201 });
}
