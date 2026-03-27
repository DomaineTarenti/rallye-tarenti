import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse, Session } from "@/lib/types";
import { TEMPLATE_OBJECTS } from "@/lib/constants";

function generateCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const l = Array.from({ length: 3 }, () =>
    letters[Math.floor(Math.random() * 26)]
  ).join("");
  const d = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `${l}${d}`;
}

// Check if a session has expired (started_at + duration + 30min grace < now)
function isSessionExpired(session: {
  started_at: string | null;
  duration_minutes: number;
}): boolean {
  if (!session.started_at) return false;
  const start = new Date(session.started_at).getTime();
  const gracePeriodMs = (session.duration_minutes + 30) * 60 * 1000;
  return Date.now() > start + gracePeriodMs;
}

// GET /api/session?code=ABC123 — get session by code
// GET /api/session?all=true — list all sessions (admin)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const all = req.nextUrl.searchParams.get("all");

  const supabase = createServerClient();

  // Admin: list all sessions
  if (all === "true") {
    // Fetch sessions without join (avoids RLS issues on related tables)
    const { data: sessionsData, error } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: error.message },
        { status: 500 }
      );
    }

    // Fetch team counts separately
    const sessionIds = (sessionsData ?? []).map((s) => s.id);
    let teamCounts: Record<string, number> = {};

    if (sessionIds.length > 0) {
      const { data: teamsData } = await supabase
        .from("teams")
        .select("session_id")
        .in("session_id", sessionIds);

      for (const t of teamsData ?? []) {
        teamCounts[t.session_id] = (teamCounts[t.session_id] ?? 0) + 1;
      }
    }

    const sessions = (sessionsData ?? []).map((s) => ({
      ...s,
      team_count: teamCounts[s.id] ?? 0,
    }));

    return NextResponse.json<ApiResponse>({ data: sessions, error: null });
  }

  // Player: get by code
  if (!code) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Code de session requis" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Session not found. Check your Access Key." },
      { status: 404 }
    );
  }

  // ── Auto-expiration check ──
  if (data.status === "active" && isSessionExpired(data)) {
    // Auto-complete and regenerate code
    const newCode = generateCode();
    await supabase
      .from("sessions")
      .update({ status: "completed", code: newCode })
      .eq("id", data.id);

    return NextResponse.json<ApiResponse>(
      { data: null, error: "This session has ended." },
      { status: 404 }
    );
  }

  return NextResponse.json<ApiResponse<Session>>({ data, error: null });
}

// POST /api/session — create a session (admin)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("sessions")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  // Also create default scoring config
  await supabase
    .from("scoring_config")
    .insert({ session_id: data.id })
    .select();

  // Clone the 9 template objects for this new session
  const sessionPrefix = data.id.slice(0, 8);
  const newObjects = TEMPLATE_OBJECTS.map((obj, i) => ({
    session_id: data.id,
    name: obj.base_name,
    physical_id: obj.physical_id,
    qr_code_id: `${obj.physical_id}-${sessionPrefix}`,
    hidden_letter: obj.hidden_letter,
    description: obj.description,
    is_final: obj.is_final,
    order: i + 1,
    narrative_name: null,
    latitude: null,
    longitude: null,
  }));

  const { error: objErr } = await supabase.from("objects").insert(newObjects);
  if (objErr) {
    console.error("Failed to clone template objects:", objErr.message);
  }

  // Create 2 default guardian staff members
  const defaultStaff = [
    {
      session_id: data.id,
      name: "Gardien 1",
      role: "gardien",
      validation_code: String(Math.floor(1000 + Math.random() * 9000)),
    },
    {
      session_id: data.id,
      name: "Gardien 2",
      role: "gardien",
      validation_code: String(Math.floor(1000 + Math.random() * 9000)),
    },
  ];

  const { error: staffErr } = await supabase.from("staff_members").insert(defaultStaff);
  if (staffErr) {
    console.error("Failed to create default staff:", staffErr.message);
  }

  // Pre-create teams if team_count > 0
  const teamCount = body.team_count ?? 0;
  if (teamCount > 0) {
    // Get freshly created objects for this session
    const { data: sessionObjects } = await supabase
      .from("objects")
      .select("id, is_final")
      .eq("session_id", data.id)
      .order("order");

    if (sessionObjects && sessionObjects.length > 0) {
      const nonFinal = sessionObjects.filter((o) => !o.is_final);
      const final = sessionObjects.find((o) => o.is_final);
      const codePrefix = data.code.slice(0, 3).toUpperCase();

      const teamsToInsert = Array.from({ length: teamCount }, (_, i) => {
        // Fisher-Yates shuffle
        const shuffled = [...nonFinal];
        for (let j = shuffled.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
        }
        if (final) shuffled.push(final);

        return {
          session_id: data.id,
          name: `Équipe ${i + 1}`,
          status: "waiting",
          object_order: shuffled.map((o) => o.id),
          access_code: `${codePrefix}${String(i + 1).padStart(2, "0")}`,
          is_precreated: true,
        };
      });

      const { error: teamsErr } = await supabase.from("teams").insert(teamsToInsert);
      if (teamsErr) {
        console.error("Failed to pre-create teams:", teamsErr.message);
      } else {
        console.log("Pre-created", teamCount, "teams for session", data.code);
      }
    }
  }

  return NextResponse.json<ApiResponse<Session>>(
    { data, error: null },
    { status: 201 }
  );
}

// PATCH /api/session — update a session
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "id requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // ── If completing a session, regenerate code + lock all teams ──
  if (updates.status === "completed") {
    updates.code = generateCode();

    // Lock all finished teams
    await supabase
      .from("teams")
      .update({ locked: true })
      .eq("session_id", id)
      .eq("status", "finished");
  }

  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<Session>>({ data, error: null });
}

// DELETE /api/session?id=xxx — delete a session (only draft/completed)
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json<ApiResponse>({ data: null, error: "id required" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data: sess } = await supabase.from("sessions").select("status").eq("id", id).single();
  if (!sess) {
    return NextResponse.json<ApiResponse>({ data: null, error: "Not found" }, { status: 404 });
  }
  if (sess.status === "active") {
    return NextResponse.json<ApiResponse>({ data: null, error: "Cannot delete an active session. End it first." }, { status: 403 });
  }
  const { error: delErr } = await supabase.from("sessions").delete().eq("id", id);
  if (delErr) {
    return NextResponse.json<ApiResponse>({ data: null, error: delErr.message }, { status: 500 });
  }
  return NextResponse.json<ApiResponse>({ data: { deleted: true }, error: null });
}
