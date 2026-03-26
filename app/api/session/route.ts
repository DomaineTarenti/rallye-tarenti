import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse, Session } from "@/lib/types";

// GET /api/session?code=ABC123 — récupérer une session par code
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Code de session requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
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

// POST /api/session — créer une session (admin)
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

  return NextResponse.json<ApiResponse<Session>>({ data, error: null }, { status: 201 });
}
