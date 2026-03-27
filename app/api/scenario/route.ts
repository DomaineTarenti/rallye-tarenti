import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";
import { TEMPLATE_OBJECTS } from "@/lib/constants";

// POST /api/scenario — generate full 11-step scenario and persist to DB
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

  const supabase = createServerClient();

  // ── Get objects for this session, clone template if none exist ──
  let { data: dbObjects } = await supabase
    .from("objects")
    .select("id, physical_id, order")
    .eq("session_id", session_id)
    .order("order");

  console.log("Session ID:", session_id, "— Objects found:", dbObjects?.length ?? 0);

  if (!dbObjects || dbObjects.length === 0) {
    console.log("No objects — cloning template objects for session", session_id);
    const sessionPrefix = session_id.slice(0, 8);
    const newObjects = TEMPLATE_OBJECTS.map((obj, i) => ({
      session_id,
      name: obj.base_name,
      physical_id: obj.physical_id,
      qr_code_id: `${obj.physical_id}-${sessionPrefix}`,
      hidden_letter: obj.hidden_letter,
      description: obj.description,
      is_final: obj.is_final,
      order: i + 1,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("objects")
      .insert(newObjects)
      .select("id, physical_id, order");

    if (insertErr || !inserted) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: `Failed to create objects: ${insertErr?.message}` },
        { status: 500 }
      );
    }
    dbObjects = inserted;
    console.log("Cloned", inserted.length, "template objects");
  }

  // Map physical_id to db object
  const objByPhysical = new Map(dbObjects.map((o) => [o.physical_id, o]));
  const objectIds = dbObjects.map((o) => o.id);

  // ── AI generation prompt — 11 steps ──
  const objectList = TEMPLATE_OBJECTS.map((o, i) =>
    `${i + 1}. ${o.base_name} (lettre cachée: ${o.hidden_letter})${i === 3 || i === 5 ? " — TYPE ÉPREUVE" : ""}${i === 8 ? " — OBJET FINAL" : ""}`
  ).join("\n");

  const prompt = `Tu es un game designer créatif pour "The Quest", une chasse au trésor interactive.

Session: "${session_name || "Untitled"}"
Thème: "${theme || "A mysterious adventure"}"

Tu dois générer EXACTEMENT 11 étapes. Pas 9, pas 10 — exactement 11.

═══ ÉTAPE 0 — Introduction commune ═══
- text_narratif: introduction immersive (4-5 phrases en français) qui plonge les joueurs dans l'univers
- enigme: une première énigme simple commune à toutes les équipes
- answer: réponse simple (1 mot en minuscules, lié au thème)
- type: "enigme"
- Pas d'objet physique associé

═══ ÉTAPES 1 à 9 — Un objet physique par étape ═══
Les objets dans l'ordre :
${objectList}

Pour chaque objet :
- narrative_name: nom narratif immersif selon le thème (ex: "La Fiole d'Huile Sacrée"). Doit commencer par le nom de base.
- text_narratif: 3-4 phrases immersives en français. La lettre cachée indiquée doit apparaître naturellement dans le texte.
- type: "enigme" pour la plupart, "epreuve" pour La Clé (étape 4) et L'Amulette (étape 6)
- enigme: l'énigme ou la description du défi physique
- answer: la réponse (mot simple, minuscules). null pour les épreuves.

═══ ÉTAPE 10 — Résolution finale ═══
- text_narratif: conclusion dramatique (3-4 phrases) — les joueurs ont toutes les lettres et doivent assembler le mot secret LABYRINTH
- type: "unlock"
- enigme: null
- answer: null
- Lié au Coffret (OBJ-09)

Retourne UNIQUEMENT du JSON valide avec exactement 11 éléments :
{
  "steps": [
    {
      "step_index": 0,
      "object_name": null,
      "narrative_name": null,
      "text_narratif": "...",
      "type": "enigme",
      "enigme": "...",
      "answer": "..."
    },
    {
      "step_index": 1,
      "object_name": "La Fiole",
      "narrative_name": "La Fiole ...",
      "text_narratif": "...",
      "type": "enigme",
      "enigme": "...",
      "answer": "..."
    },
    ...
    {
      "step_index": 10,
      "object_name": "Le Coffret",
      "narrative_name": null,
      "text_narratif": "...",
      "type": "unlock",
      "enigme": null,
      "answer": null
    }
  ]
}

IMPORTANT: exactement 11 éléments (step_index 0 à 10).`;

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
    const aiSteps = (scenario.steps ?? scenario.stages) as Array<Record<string, string | null>>;

    if (!aiSteps || aiSteps.length < 11) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: `AI generated ${aiSteps?.length ?? 0} steps instead of 11` },
        { status: 500 }
      );
    }

    // ── Persist to Supabase ──

    // Delete existing steps for these objects
    await supabase.from("steps").delete().in("object_id", objectIds);

    const stepsToInsert: Array<Record<string, unknown>> = [];
    const narrativeUpdates: Array<{ id: string; narrative_name: string }> = [];

    for (const step of aiSteps) {
      const stepIndex = Number(step.step_index ?? aiSteps.indexOf(step));

      if (stepIndex === 0) {
        // Step 0 — Introduction: store in session, not in steps table
        await supabase
          .from("sessions")
          .update({
            intro_text: step.text_narratif ?? null,
            intro_enigme: step.enigme ?? null,
            intro_answer: step.answer ?? null,
          })
          .eq("id", session_id);

      } else if (stepIndex >= 1 && stepIndex <= 9) {
        // Steps 1-9 — physical objects → insert into steps table
        const objInfo = TEMPLATE_OBJECTS[stepIndex - 1];
        const dbObj = objByPhysical.get(objInfo.physical_id);
        if (!dbObj) continue;

        const stepType = step.type === "epreuve" ? "epreuve" : "enigme";

        stepsToInsert.push({
          object_id: dbObj.id,
          text_narratif: step.text_narratif ?? "",
          enigme: step.enigme ?? null,
          answer: stepType === "epreuve" ? null : (step.answer ?? null),
          type: stepType,
          order: stepIndex,
        });

        if (step.narrative_name) {
          narrativeUpdates.push({ id: dbObj.id, narrative_name: step.narrative_name });
        }

      } else if (stepIndex === 10) {
        // Step 10 — Unlock: the /unlock page handles this,
        // but save the conclusion text as the Coffret's step narrative
        const coffret = objByPhysical.get("OBJ-09");
        if (coffret && step.text_narratif) {
          // Update the Coffret object's description with the conclusion
          await supabase
            .from("objects")
            .update({ description: step.text_narratif })
            .eq("id", coffret.id);
        }
      }
    }

    // Batch insert steps 1-9
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

    console.log("Scenario generated:", stepsToInsert.length, "steps + intro persisted for session", session_id);

    return NextResponse.json<ApiResponse>({
      data: { success: true, steps_count: stepsToInsert.length + 2 }, // +2 for intro + unlock
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
