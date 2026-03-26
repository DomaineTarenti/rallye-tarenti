import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// GET /api/objects?session_id=xxx — list objects with steps
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "session_id required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("objects")
    .select("*, steps(*)")
    .eq("session_id", sessionId)
    .order("order");

  if (error) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ data, error: null });
}

// POST /api/objects — create object + step
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id, name, order, description, step } = body;

  if (!session_id || !name) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "session_id and name required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Generate QR code ID
  const qr_code_id = `QR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const { data: obj, error: objErr } = await supabase
    .from("objects")
    .insert({ session_id, name, order: order ?? 0, description, qr_code_id })
    .select()
    .single();

  if (objErr || !obj) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: objErr?.message ?? "Failed to create object" },
      { status: 500 }
    );
  }

  // Create associated step if provided
  if (step) {
    const { data: stepData } = await supabase
      .from("steps")
      .insert({
        object_id: obj.id,
        text_narratif: step.text_narratif ?? "",
        enigme: step.enigme ?? null,
        answer: step.answer ?? null,
        type: step.type ?? "enigme",
        order: order ?? 0,
        photo_indice_url: step.photo_indice_url ?? null,
      })
      .select()
      .single();

    return NextResponse.json<ApiResponse>(
      { data: { ...obj, steps: stepData ? [stepData] : [] }, error: null },
      { status: 201 }
    );
  }

  return NextResponse.json<ApiResponse>(
    { data: { ...obj, steps: [] }, error: null },
    { status: 201 }
  );
}

// PATCH /api/objects — update object + step
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, step_id, step, ...objUpdates } = body;

  if (!id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "id required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Update object
  if (Object.keys(objUpdates).length > 0) {
    await supabase.from("objects").update(objUpdates).eq("id", id);
  }

  // Update step
  if (step_id && step) {
    await supabase.from("steps").update(step).eq("id", step_id);
  }

  // Return updated object with steps
  const { data } = await supabase
    .from("objects")
    .select("*, steps(*)")
    .eq("id", id)
    .single();

  return NextResponse.json<ApiResponse>({ data, error: null });
}

// DELETE /api/objects?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "id required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("objects").delete().eq("id", id);

  if (error) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ data: { deleted: true }, error: null });
}
