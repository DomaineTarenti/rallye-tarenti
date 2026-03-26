import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
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

  // Check if progress entry exists
  const { data: existing } = await supabase
    .from("team_progress")
    .select("id, status")
    .eq("team_id", team_id)
    .eq("step_id", step_id)
    .single();

  if (existing) {
    // Update to active (or completed if already active)
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

    // If we completed it, activate the next locked step
    if (newStatus === "completed") {
      const { data: allProgress } = await supabase
        .from("team_progress")
        .select("id, step_id, status")
        .eq("team_id", team_id);

      const { data: allSteps } = await supabase
        .from("steps")
        .select("id, order")
        .in("id", (allProgress ?? []).map((p) => p.step_id));

      const stepOrder = new Map((allSteps ?? []).map((s) => [s.id, s.order]));
      const nextLocked = (allProgress ?? [])
        .filter((p) => p.status === "locked")
        .sort((a, b) => (stepOrder.get(a.step_id) ?? 0) - (stepOrder.get(b.step_id) ?? 0));

      if (nextLocked.length > 0) {
        await supabase.from("team_progress").update({ status: "active" }).eq("id", nextLocked[0].id);
      }
    }

    return NextResponse.json<ApiResponse>({ data, error: null });
  }

  // Create new progress entry as active
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
