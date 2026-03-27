import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// PATCH /api/team/letters — update collected_letters for a team
export async function PATCH(req: NextRequest) {
  const { team_id, collected_letters } = await req.json();

  if (!team_id || !collected_letters) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id and collected_letters required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("teams")
    .update({ collected_letters })
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
