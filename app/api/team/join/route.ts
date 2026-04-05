import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ApiResponse } from "@/lib/types";

// POST /api/team/join — rejoindre une équipe pré-créée par son code
export async function POST(req: NextRequest) {
  const { access_code } = await req.json();

  if (!access_code) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "access_code requis" },
      { status: 400 }
    );
  }

  // Rate limiting : max 10 tentatives par IP par minute (anti brute-force des codes)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = checkRateLimit(`join:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: `Trop de tentatives. Réessayez dans ${rl.retryAfter}s.` },
      { status: 429 }
    );
  }

  const supabase = createServerClient();

  // Trouver l'équipe par son code
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("*, sessions(*)")
    .eq("access_code", access_code.toUpperCase().trim())
    .single();

  if (teamErr || !team) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Code non reconnu. Demandez votre code à l'accueil." },
      { status: 404 }
    );
  }

  // Équipe déjà terminée
  if (team.status === "finished") {
    const session = team.sessions;
    return NextResponse.json<ApiResponse>({
      data: {
        team: { ...team, sessions: undefined },
        session,
        finished: true,
        objects: [],
        steps: [],
        progress: [],
      },
      error: null,
    });
  }

  // Vérifier que la session est active
  const session = team.sessions;
  if (!session || session.status !== "active") {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "La session n'est pas encore ouverte. Revenez bientôt !" },
      { status: 403 }
    );
  }

  // Marquer l'équipe comme "playing" au premier join
  const updates: Record<string, unknown> = {};
  if (team.status === "waiting") {
    updates.status = "playing";
    updates.started_at = new Date().toISOString();
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("teams").update(updates).eq("id", team.id);
  }

  // Charger les objets (ordre fixe par colonne "order")
  const sessionId = team.session_id;
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

  // Trier les steps par ordre d'objet
  const objectOrderMap = new Map((objects ?? []).map((o) => [o.id, o.order]));
  steps.sort((a, b) => {
    const oa = objectOrderMap.get(a.object_id as string) ?? 0;
    const ob = objectOrderMap.get(b.object_id as string) ?? 0;
    return oa - ob;
  });

  // Récupérer ou initialiser la progression
  let { data: progress } = await supabase
    .from("team_progress")
    .select("*")
    .eq("team_id", team.id);

  if (!progress || progress.length === 0) {
    if (steps.length > 0) {
      const entries = steps.map((s, idx) => ({
        team_id: team.id,
        step_id: s.id,
        status: idx === 0 ? "active" : "locked",
      }));
      const { data: created } = await supabase
        .from("team_progress")
        .insert(entries)
        .select();
      progress = created ?? [];
    }
  }

  return NextResponse.json<ApiResponse>({
    data: {
      team: { ...team, sessions: undefined, ...updates },
      session,
      objects: objects ?? [],
      steps,
      progress: progress ?? [],
    },
    error: null,
  });
}
