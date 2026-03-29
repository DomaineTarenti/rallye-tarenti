import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { calculateScore, getRank } from "@/lib/scoring";
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

  const { data: session } = await supabase
    .from("sessions")
    .select("secret_word")
    .eq("id", team.session_id)
    .single();

  const secretWord = (session?.secret_word ?? "LABYRINTH").toUpperCase();
  const attempt = word_attempt.toUpperCase().trim();

  if (attempt === secretWord) {
    // Calculate final score
    const startTime = team.started_at
      ? new Date(team.started_at).getTime()
      : team.created_at
      ? new Date(team.created_at).getTime()
      : Date.now() - 3600000; // fallback 1h ago
    const endTime = Date.now();

    // Get all hints used
    const { data: progress } = await supabase
      .from("team_progress")
      .select("hint_types, hints_used")
      .eq("team_id", team_id);

    const allHints = (progress ?? [])
      .flatMap((p) => (p.hint_types as string[]) ?? [])
      .map((type) => ({ type }));

    const finalScore = calculateScore(startTime, endTime, allHints);
    const { key: rank, label: rankLabel } = getRank(finalScore);
    const completionTime = Math.floor((endTime - startTime) / 1000);

    // Save final results
    await supabase
      .from("teams")
      .update({
        status: "finished",
        locked: true,
        final_score: finalScore,
        rank,
        rank_label: rankLabel,
        completion_time: completionTime,
      })
      .eq("id", team_id);

    // Calculate position among all teams in this session
    const { data: allTeams } = await supabase
      .from("teams")
      .select("id, final_score, status")
      .eq("session_id", team.session_id)
      .eq("status", "finished")
      .order("final_score", { ascending: false });

    const position = (allTeams ?? []).findIndex((t) => t.id === team_id) + 1;
    const totalFinished = (allTeams ?? []).length;

    return NextResponse.json<ApiResponse>({
      data: {
        success: true,
        final_score: finalScore,
        rank,
        rank_label: rankLabel,
        completion_time: completionTime,
        time_penalty: Math.floor((endTime - startTime) / 1000 / 60) * 2,
        hint_penalty: allHints.reduce((t, h) => {
          if (h.type === "narratif") return t + 15;
          if (h.type === "photo") return t + 25;
          if (h.type === "direct") return t + 50;
          return t + 15;
        }, 0),
        hints_count: allHints.length,
        position,
        total_finished: totalFinished,
      },
      error: null,
    });
  }

  return NextResponse.json<ApiResponse>({
    data: { success: false, message: "That is not the secret word... try again." },
    error: null,
  });
}
