import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// POST /api/admin/add-time — add bonus time to a team
export async function POST(req: NextRequest) {
  const { team_id, minutes } = await req.json();

  if (!team_id || !minutes) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id and minutes required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Get current time_bonus
  const { data: team } = await supabase
    .from("teams")
    .select("time_bonus")
    .eq("id", team_id)
    .single();

  const currentBonus = team?.time_bonus ?? 0;

  const { data, error } = await supabase
    .from("teams")
    .update({ time_bonus: currentBonus + minutes })
    .eq("id", team_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ data, error: null });
}
