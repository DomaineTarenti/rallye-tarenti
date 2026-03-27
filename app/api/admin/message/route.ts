import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// POST /api/admin/message — send a message to a team
export async function POST(req: NextRequest) {
  const { team_id, session_id, message, type } = await req.json();

  if (!team_id || !message?.trim()) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id and message required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("team_messages")
    .insert({ team_id, session_id: session_id ?? null, message: message.trim(), type: type ?? "message" })
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ data, error: null }, { status: 201 });
}
