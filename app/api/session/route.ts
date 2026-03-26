import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse, Session } from "@/lib/types";

// GET /api/session?code=ABC123 — get session by code
// GET /api/session?all=true — list all sessions (admin)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const all = req.nextUrl.searchParams.get("all");

  const supabase = createServerClient();

  // Admin: list all sessions
  if (all === "true") {
    const { data, error } = await supabase
      .from("sessions")
      .select("*, teams(id)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: error.message },
        { status: 500 }
      );
    }

    // Count teams per session
    const sessions = (data ?? []).map((s) => ({
      ...s,
      team_count: Array.isArray(s.teams) ? s.teams.length : 0,
      teams: undefined,
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
      { data: null, error: "Session introuvable" },
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
