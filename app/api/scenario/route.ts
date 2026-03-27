import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

const OBJECTS = [
  { physical_id: "OBJ-01", base_name: "La Fiole", hidden_letter: "L" },
  { physical_id: "OBJ-02", base_name: "Le Fragment", hidden_letter: "A" },
  { physical_id: "OBJ-03", base_name: "Le Sceau", hidden_letter: "B" },
  { physical_id: "OBJ-04", base_name: "La Clé", hidden_letter: "Y" },
  { physical_id: "OBJ-05", base_name: "Le Parchemin", hidden_letter: "R" },
  { physical_id: "OBJ-06", base_name: "L'Amulette", hidden_letter: "I" },
  { physical_id: "OBJ-07", base_name: "L'Urne", hidden_letter: "N" },
  { physical_id: "OBJ-08", base_name: "Le Médaillon", hidden_letter: "T" },
  { physical_id: "OBJ-09", base_name: "Le Coffret", hidden_letter: "H" },
];

// POST /api/scenario — generate full 9-stage scenario and persist to DB
export async function POST(req: NextRequest) {
  const { session_id, theme, session_name } = await req.json();

  if (!session_id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "session_id required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const prompt = `Tu es un game designer créatif pour "The Quest", une chasse au trésor interactive.

Session: "${session_name || "Untitled"}"
Thème: "${theme || "A mysterious adventure"}"

Génère exactement 9 étapes, une par objet physique permanent.
Les 9 objets sont : La Fiole, Le Fragment, Le Sceau, La Clé, Le Parchemin, L'Amulette, L'Urne, Le Médaillon, Le Coffret.
Les lettres cachées du mot LABYRINTH sont : L, A, B, Y, R, I, N, T, H (une par objet dans l'ordre).

RÈGLES STRICTES :
- Étapes 1-3, 5, 7-8 : type "enigme" — texte narratif + énigme + réponse (mot simple, en minuscules)
- Étape 4 (La Clé) : type "epreuve" — défi physique validé par un gardien, pas de réponse
- Étape 6 (L'Amulette) : type "epreuve" — défi de cohésion d'équipe, pas de réponse
- Étape 9 (Le Coffret) : type "enigme" — conclusion dramatique, l'énigme finale dont la réponse est le nom du domaine/lieu

Pour chaque étape :
1. narrative_name : nom narratif immersif basé sur le thème (ex: "La Fiole d'Huile Sacrée"). Doit commencer par le nom de base.
2. text_narratif : texte immersif de 3-4 phrases en français. La lettre cachée (${OBJECTS.map(o => o.hidden_letter).join(",")}) doit apparaître naturellement dans le texte.
3. enigme : l'énigme ou description du défi (en français)
4. answer : la réponse (mot simple, minuscules, en français). null pour les épreuves.

Retourne UNIQUEMENT du JSON valide :
{
  "stages": [
    {
      "object_name": "La Fiole",
      "narrative_name": "La Fiole ...",
      "text_narratif": "...",
      "type": "enigme",
      "enigme": "...",
      "answer": "..."
    }
  ]
}

IMPORTANT : exactement 9 stages, dans l'ordre des objets.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json<ApiResponse>(
        { data: null, error: `Claude API error: ${err}` },
        { status: 500 }
      );
    }

    const result = await res.json();
    const text = result.content?.[0]?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const scenario = JSON.parse(jsonMatch[0]);
    const stages = scenario.stages as Array<Record<string, string>>;

    if (!stages || stages.length < 9) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: `AI generated ${stages?.length ?? 0} stages instead of 9` },
        { status: 500 }
      );
    }

    // ── Persist to Supabase ──
    const supabase = createServerClient();

    // Get all objects for this session
    const { data: dbObjects } = await supabase
      .from("objects")
      .select("id, physical_id, order")
      .eq("session_id", session_id)
      .order("order");

    if (!dbObjects || dbObjects.length === 0) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: "No objects found for this session" },
        { status: 400 }
      );
    }

    // Map physical_id to db object
    const objByPhysical = new Map(dbObjects.map((o) => [o.physical_id, o]));

    // Delete existing steps for these objects
    const objectIds = dbObjects.map((o) => o.id);
    await supabase.from("steps").delete().in("object_id", objectIds);

    // Insert new steps and update narrative_names
    const stepsToInsert: Array<Record<string, unknown>> = [];
    const narrativeUpdates: Array<{ id: string; narrative_name: string }> = [];

    for (let i = 0; i < Math.min(stages.length, 9); i++) {
      const stage = stages[i];
      const objInfo = OBJECTS[i];
      const dbObj = objByPhysical.get(objInfo.physical_id);
      if (!dbObj) continue;

      stepsToInsert.push({
        object_id: dbObj.id,
        text_narratif: stage.text_narratif ?? "",
        enigme: stage.enigme ?? null,
        answer: stage.type === "epreuve" ? null : (stage.answer ?? null),
        type: stage.type ?? "enigme",
        order: i + 1,
      });

      if (stage.narrative_name) {
        narrativeUpdates.push({ id: dbObj.id, narrative_name: stage.narrative_name });
      }
    }

    // Batch insert steps
    if (stepsToInsert.length > 0) {
      const { error: stepsErr } = await supabase.from("steps").insert(stepsToInsert);
      if (stepsErr) {
        return NextResponse.json<ApiResponse>(
          { data: null, error: `Failed to save steps: ${stepsErr.message}` },
          { status: 500 }
        );
      }
    }

    // Update narrative_names on objects
    for (const upd of narrativeUpdates) {
      await supabase
        .from("objects")
        .update({ narrative_name: upd.narrative_name })
        .eq("id", upd.id);
    }

    return NextResponse.json<ApiResponse>({
      data: { success: true, steps_count: stepsToInsert.length },
      error: null,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      {
        data: null,
        error: `AI generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
