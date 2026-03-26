import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// POST /api/team — create a team + initialize progress
export async function POST(req: NextRequest) {
  const { session_id, name, character } = await req.json();

  if (!session_id || !name) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "session_id et name requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // ── Check session is still active ──
  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, started_at, duration_minutes")
    .eq("id", session_id)
    .single();

  if (!session || session.status !== "active") {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "This session is no longer accepting teams." },
      { status: 403 }
    );
  }

  // ── Auto-expiration check ──
  if (session.started_at) {
    const start = new Date(session.started_at).getTime();
    const gracePeriodMs = (session.duration_minutes + 30) * 60 * 1000;
    if (Date.now() > start + gracePeriodMs) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: "This session has expired." },
        { status: 403 }
      );
    }
  }

  // ── Check if team code already used and locked ──
  if (character) {
    try {
      const parsed = typeof character === "string" ? JSON.parse(character) : character;
      if (parsed.teamCode) {
        const { data: existingTeam } = await supabase
          .from("teams")
          .select("id, locked")
          .eq("session_id", session_id)
          .filter("character", "like", `%"teamCode":"${parsed.teamCode}"%`)
          .single();

        if (existingTeam?.locked) {
          return NextResponse.json<ApiResponse>(
            { data: null, error: "This fellowship has already completed their journey." },
            { status: 403 }
          );
        }
      }
    } catch {
      // character parsing failed, continue normally
    }
  }

  // 1. Create team
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      session_id,
      name,
      character: typeof character === "string" ? character : JSON.stringify(character),
      status: "playing",
    })
    .select()
    .single();

  if (teamError || !team) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: teamError?.message ?? "Failed to create team" },
      { status: 500 }
    );
  }

  // 2. Get all objects for session, ordered
  const { data: objects } = await supabase
    .from("objects")
    .select("*")
    .eq("session_id", session_id)
    .order("order");

  // 3. Get all steps for those objects, ordered
  const objectIds = (objects ?? []).map((o) => o.id);
  let steps: Array<Record<string, unknown>> = [];

  if (objectIds.length > 0) {
    const { data: stepsData } = await supabase
      .from("steps")
      .select("*")
      .in("object_id", objectIds)
      .order("order");

    steps = stepsData ?? [];
  }

  // Sort steps by their object order, then step order
  const objectOrderMap = new Map((objects ?? []).map((o) => [o.id, o.order]));
  steps.sort((a, b) => {
    const objOrderA = objectOrderMap.get(a.object_id as string) ?? 0;
    const objOrderB = objectOrderMap.get(b.object_id as string) ?? 0;
    if (objOrderA !== objOrderB) return objOrderA - objOrderB;
    return ((a.order as number) ?? 0) - ((b.order as number) ?? 0);
  });

  // 4. Initialize team_progress for all steps
  let progress: Array<Record<string, unknown>> = [];

  if (steps.length > 0) {
    const progressEntries = steps.map((step, idx) => ({
      team_id: team.id,
      step_id: step.id,
      status: idx === 0 ? "active" : "locked",
    }));

    const { data: progressData } = await supabase
      .from("team_progress")
      .insert(progressEntries)
      .select();

    progress = progressData ?? [];
  }

  return NextResponse.json<ApiResponse>(
    {
      data: { team, objects: objects ?? [], steps, progress },
      error: null,
    },
    { status: 201 }
  );
}
