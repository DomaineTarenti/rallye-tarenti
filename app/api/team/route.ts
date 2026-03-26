import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// GET /api/team?code=LIO42&session_id=xxx — recover team by fellowship code
export async function GET(req: NextRequest) {
  const teamCode = req.nextUrl.searchParams.get("code");
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!teamCode || !sessionId) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "code and session_id required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Search for team by code embedded in character JSON
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("session_id", sessionId)
    .like("character", `%"teamCode":"${teamCode.toUpperCase()}"%`);

  const team = teams?.[0];

  if (!team) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Fellowship not found. Check your code." },
      { status: 404 }
    );
  }

  if (team.locked) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "This fellowship has already completed their journey." },
      { status: 403 }
    );
  }

  // Load game state
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

  const objectOrderMap = new Map((objects ?? []).map((o) => [o.id, o.order]));
  steps.sort((a, b) => {
    const oa = objectOrderMap.get(a.object_id as string) ?? 0;
    const ob = objectOrderMap.get(b.object_id as string) ?? 0;
    if (oa !== ob) return oa - ob;
    return ((a.order as number) ?? 0) - ((b.order as number) ?? 0);
  });

  const { data: progressData } = await supabase
    .from("team_progress")
    .select("*")
    .eq("team_id", team.id);

  return NextResponse.json<ApiResponse>({
    data: { team, objects: objects ?? [], steps, progress: progressData ?? [] },
    error: null,
  });
}

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

  // 1. Get all objects for session
  const { data: allObjects } = await supabase
    .from("objects")
    .select("*")
    .eq("session_id", session_id)
    .order("order");

  // 2. Generate randomized object order (final object always last)
  const regularObjects = (allObjects ?? []).filter((o) => !o.is_final);
  const finalObject = (allObjects ?? []).find((o) => o.is_final);

  // Fisher-Yates shuffle
  const shuffled = [...regularObjects];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const orderedObjects = finalObject ? [...shuffled, finalObject] : shuffled;
  const objectOrder = orderedObjects.map((o) => o.id);

  // 3. Create team with object_order
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      session_id,
      name,
      character: typeof character === "string" ? character : JSON.stringify(character),
      status: "playing",
      object_order: objectOrder,
    })
    .select()
    .single();

  if (teamError || !team) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: teamError?.message ?? "Failed to create team" },
      { status: 500 }
    );
  }

  // 4. Get steps for ordered objects
  const objectIds = orderedObjects.map((o) => o.id);
  let steps: Array<Record<string, unknown>> = [];

  if (objectIds.length > 0) {
    const { data: stepsData } = await supabase
      .from("steps")
      .select("*")
      .in("object_id", objectIds)
      .order("order");
    steps = stepsData ?? [];
  }

  // Sort steps by the team's object order
  const objOrderIdx = new Map(objectOrder.map((id, idx) => [id, idx]));
  steps.sort((a, b) => {
    const oa = objOrderIdx.get(a.object_id as string) ?? 999;
    const ob = objOrderIdx.get(b.object_id as string) ?? 999;
    if (oa !== ob) return oa - ob;
    return ((a.order as number) ?? 0) - ((b.order as number) ?? 0);
  });

  // 5. Initialize team_progress in the team's order
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
      data: {
        team,
        objects: orderedObjects,
        steps,
        progress,
        intro_text: null, // fetched separately
      },
      error: null,
    },
    { status: 201 }
  );
}
