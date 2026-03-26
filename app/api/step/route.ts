import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse, Step } from "@/lib/types";

// GET /api/step?object_id=xxx — étapes d'un objet
export async function GET(req: NextRequest) {
  const objectId = req.nextUrl.searchParams.get("object_id");
  if (!objectId) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "object_id requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("steps")
    .select("*")
    .eq("object_id", objectId)
    .order("order");

  if (error) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<Step[]>>({ data, error: null });
}
