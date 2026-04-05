import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

// POST /api/photo — uploader une photo vers Supabase Storage
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let team_id: string, step_id: string | null, object_id: string | null;
  let buffer: Buffer;

  if (contentType.includes("multipart/form-data")) {
    // FormData (nouvelle méthode — plus légère)
    const formData = await req.formData();
    team_id = formData.get("team_id") as string;
    step_id = formData.get("step_id") as string | null;
    object_id = formData.get("object_id") as string | null;
    const imageFile = formData.get("image") as File | null;
    if (!team_id || !imageFile) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: "team_id et image requis" },
        { status: 400 }
      );
    }
    buffer = Buffer.from(await imageFile.arrayBuffer());
  } else {
    // JSON base64 (compatibilité ancienne méthode)
    const body = await req.json();
    team_id = body.team_id;
    step_id = body.step_id ?? null;
    object_id = body.object_id ?? null;
    const image_base64 = body.image_base64;
    if (!team_id || !image_base64) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: "team_id et image_base64 requis" },
        { status: 400 }
      );
    }
    buffer = Buffer.from(image_base64, "base64");
  }

  // Vérification taille
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: `Photo trop lourde (max ${MAX_SIZE_BYTES / 1024 / 1024} MB)` },
      { status: 413 }
    );
  }

  const supabase = createServerClient();

  // Idempotence : si une photo existe déjà pour cette équipe + étape, la retourner directement
  if (step_id) {
    const { data: existing } = await supabase
      .from("photos")
      .select("id, storage_url, team_id, step_id, object_id, created_at")
      .eq("team_id", team_id)
      .eq("step_id", step_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json<ApiResponse>({ data: existing, error: null }, { status: 200 });
    }
  }

  const fileName = `${team_id}/${step_id ?? Date.now()}_${Date.now()}.jpg`;

  // Uploader dans le bucket "team-photos"
  const { error: uploadError } = await supabase.storage
    .from("team-photos")
    .upload(fileName, buffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: `Erreur upload: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Récupérer l'URL publique
  const { data: urlData } = supabase.storage
    .from("team-photos")
    .getPublicUrl(fileName);

  const storageUrl = urlData?.publicUrl;

  if (!storageUrl) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Impossible de récupérer l'URL de la photo." },
      { status: 500 }
    );
  }

  // Enregistrer en base
  const { data: photo, error: dbError } = await supabase
    .from("photos")
    .insert({
      team_id,
      step_id: step_id ?? null,
      object_id: object_id ?? null,
      storage_url: storageUrl,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: dbError.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ data: photo, error: null }, { status: 201 });
}

// GET /api/photo?team_id=xxx  — photos d'une équipe
// GET /api/photo?session_id=xxx — toutes les photos d'une session (admin)
export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("team_id");
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const supabase = createServerClient();

  if (sessionId) {
    const { data: photos, error } = await supabase
      .from("photos")
      .select(`
        id, storage_url, created_at, team_id,
        teams!inner(name, session_id),
        objects(name, emoji, "order")
      `)
      .eq("teams.session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json<ApiResponse>({ data: null, error: error.message }, { status: 500 });
    }
    return NextResponse.json<ApiResponse>({ data: photos ?? [], error: null });
  }

  if (!teamId) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id ou session_id requis" },
      { status: 400 }
    );
  }

  const { data: photos, error } = await supabase
    .from("photos")
    .select("*, objects(name, emoji, \"order\")")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json<ApiResponse>({ data: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json<ApiResponse>({ data: photos ?? [], error: null });
}
