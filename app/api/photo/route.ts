import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

// POST /api/photo — uploader une photo vers Supabase Storage
export async function POST(req: NextRequest) {
  const { team_id, step_id, object_id, image_base64 } = await req.json();

  if (!team_id || !image_base64) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id et image_base64 requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Convertir base64 en Buffer
  const buffer = Buffer.from(image_base64, "base64");
  const fileName = `${team_id}/${step_id ?? Date.now()}_${Date.now()}.jpg`;

  // Uploader dans le bucket "team-photos"
  const { error: uploadError } = await supabase.storage
    .from("team-photos")
    .upload(fileName, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("[PHOTO] Upload error:", uploadError.message);
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
    console.error("[PHOTO] DB insert error:", dbError.message);
    return NextResponse.json<ApiResponse>(
      { data: null, error: dbError.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ data: photo, error: null }, { status: 201 });
}

// GET /api/photo?team_id=xxx — récupérer les photos d'une équipe
export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("team_id");

  if (!teamId) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id requis" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: photos, error } = await supabase
    .from("photos")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse>({ data: photos ?? [], error: null });
}
