import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// GET /api/team/join?access_code=SMU01 — look up a pre-created team
export async function GET(req: NextRequest) {
  const accessCode = req.nextUrl.searchParams.get("access_code");

  if (!accessCode) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "access_code required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("*, sessions(*)")
    .eq("access_code", accessCode.toUpperCase().trim())
    .single();

  if (teamErr || !team) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Team code not found." },
      { status: 404 }
    );
  }

  return NextResponse.json<ApiResponse>({
    data: { team: { ...team, sessions: undefined }, session: team.sessions },
    error: null,
  });
}

// POST /api/team/join — join a pre-created team by access_code
export async function POST(req: NextRequest) {
  const { access_code, name, character } = await req.json();

  if (!access_code) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "access_code required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Find team by access code
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("*, sessions(*)")
    .eq("access_code", access_code.toUpperCase().trim())
    .single();

  if (teamErr || !team) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Code not recognized. Check your Access Key or Team Code." },
      { status: 404 }
    );
  }

  if (team.status === "finished") {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "This team has already finished." },
      { status: 403 }
    );
  }

  // Update team with player's chosen name/character if provided
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (character) updates.character = typeof character === "string" ? character : JSON.stringify(character);
  if (team.status === "waiting") {
    updates.status = "playing";
    updates.started_at = new Date().toISOString();
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("teams").update(updates).eq("id", team.id);
  }

  // Get objects + steps + progress
  const sessionId = team.session_id;
  const { data: objects } = await supabase
    .from("objects")
    .select("*")
    .eq("session_id", sessionId)
    .order("order");

  const objectIds = (objects ?? []).map((o) => o.id);
  let steps: Array<Record<string, unknown>> = [];
  if (objectIds.length > 0) {
    const { data } = await supabase
      .from("steps")
      .select("*")
      .in("object_id", objectIds)
      .order("order");
    steps = data ?? [];
  }

  // Sort by team's object_order
  const objOrderIdx = new Map<string, number>((team.object_order ?? []).map((id: string, idx: number) => [id, idx]));
  steps.sort((a, b) => {
    const oa = objOrderIdx.get(a.object_id as string) ?? 999;
    const ob = objOrderIdx.get(b.object_id as string) ?? 999;
    if (oa !== ob) return oa - ob;
    return ((a.order as number) ?? 0) - ((b.order as number) ?? 0);
  });

  // Get or initialize progress
  let { data: progress } = await supabase
    .from("team_progress")
    .select("*")
    .eq("team_id", team.id);

  if (!progress || progress.length === 0) {
    // Initialize progress for this team
    if (steps.length > 0) {
      const entries = steps.map((s, idx) => ({
        team_id: team.id,
        step_id: s.id,
        status: idx === 0 ? "active" : "locked",
      }));
      const { data: created } = await supabase
        .from("team_progress")
        .insert(entries)
        .select();
      progress = created ?? [];
    }
  }

  const session = team.sessions;

  return NextResponse.json<ApiResponse>({
    data: {
      team: { ...team, sessions: undefined, ...updates },
      session,
      objects: objects ?? [],
      steps,
      progress: progress ?? [],
    },
    error: null,
  });
}
