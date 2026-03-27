import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// POST /api/unlock — attempt to unlock the final treasure
export async function POST(req: NextRequest) {
  const { team_id, word_attempt } = await req.json();

  if (!team_id || !word_attempt) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id and word_attempt required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Get team
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("*")
    .eq("id", team_id)
    .single();

  if (teamErr || !team) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Team not found" },
      { status: 404 }
    );
  }

  // Get session secret word
  const { data: session } = await supabase
    .from("sessions")
    .select("secret_word")
    .eq("id", team.session_id)
    .single();

  const secretWord = (session?.secret_word ?? "LABYRINTH").toUpperCase();
  const attempt = word_attempt.toUpperCase().trim();

  if (attempt === secretWord) {
    // Mark team as finished
    await supabase
      .from("teams")
      .update({ status: "finished", locked: true })
      .eq("id", team_id);

    return NextResponse.json<ApiResponse>({
      data: { success: true, message: "The treasure is unlocked!" },
      error: null,
    });
  }

  // Wrong attempt — deduct 20 points (tracked client-side)
  return NextResponse.json<ApiResponse>({
    data: { success: false, message: "That is not the secret word... try again." },
    error: null,
  });
}
