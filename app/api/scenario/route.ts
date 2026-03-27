import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";
import { TEMPLATE_OBJECTS } from "@/lib/constants";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 4000;
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

// POST /api/scenario — generate 11-step scenario in 2 batches and persist
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

  // ── Get or create objects ──
  let { data: dbObjects } = await supabase
    .from("objects")
    .select("id, physical_id, order")
    .eq("session_id", session_id)
    .order("order");

  if (!dbObjects || dbObjects.length === 0) {
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
  }

  const objByPhysical = new Map(dbObjects.map((o) => [o.physical_id, o]));
  const objectIds = dbObjects.map((o) => o.id);
  const themeStr = theme || "A mysterious adventure";
  const nameStr = session_name || "Untitled";

  try {
    // ── BATCH 1: Intro + steps 1-5 ──
    const batch1 = await callAI(apiKey, `Tu es un game designer pour "The Quest", chasse au trésor interactive.
Session: "${nameStr}" | Thème: "${themeStr}"

Génère exactement 6 étapes en JSON. Sois concis.

ÉTAPE 0 — Intro: text_narratif (3 phrases), enigme (simple), answer (1 mot minuscule), type "enigme"
ÉTAPE 1 — La Fiole (lettre L): narrative_name, text_narratif (2-3 phrases), enigme, answer, type "enigme"
ÉTAPE 2 — Le Fragment (lettre A): narrative_name, text_narratif, enigme, answer, type "enigme"
ÉTAPE 3 — Le Sceau (lettre B): narrative_name, text_narratif, enigme, answer, type "enigme"
ÉTAPE 4 — La Clé (lettre Y): narrative_name, text_narratif, enigme (défi physique), answer null, type "epreuve"
ÉTAPE 5 — Le Parchemin (lettre R): narrative_name, text_narratif, enigme, answer, type "enigme"

JSON strict: {"steps":[{"step_index":0,"narrative_name":null,"text_narratif":"...","type":"enigme","enigme":"...","answer":"..."},...]}`);

    // ── BATCH 2: Steps 6-10 ──
    const batch2 = await callAI(apiKey, `Suite de la génération pour "${nameStr}" | Thème: "${themeStr}"

Génère exactement 5 étapes en JSON. Sois concis.

ÉTAPE 6 — L'Amulette (lettre I): narrative_name, text_narratif (2-3 phrases), enigme (défi cohésion), answer null, type "epreuve"
ÉTAPE 7 — L'Urne (lettre N): narrative_name, text_narratif, enigme, answer, type "enigme"
ÉTAPE 8 — Le Médaillon (lettre T): narrative_name, text_narratif, enigme, answer, type "enigme"
ÉTAPE 9 — Le Coffret (lettre H): narrative_name, text_narratif, enigme finale, answer, type "enigme"
ÉTAPE 10 — Résolution: text_narratif (conclusion dramatique, 2 phrases), type "unlock", enigme null, answer null

JSON strict: {"steps":[{"step_index":6,"narrative_name":"...","text_narratif":"...","type":"epreuve","enigme":"...","answer":null},...]}`);

    // ── Merge both batches ──
    const allSteps = [...batch1, ...batch2];

    if (allSteps.length < 11) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: `AI generated ${allSteps.length} steps instead of 11` },
        { status: 500 }
      );
    }

    // ── Persist to Supabase ──
    await supabase.from("steps").delete().in("object_id", objectIds);

    const stepsToInsert: Array<Record<string, unknown>> = [];
    const narrativeUpdates: Array<{ id: string; narrative_name: string }> = [];

    for (const step of allSteps) {
      const idx = Number(step.step_index ?? allSteps.indexOf(step));

      if (idx === 0) {
        await supabase
          .from("sessions")
          .update({
            intro_text: step.text_narratif ?? null,
            intro_enigme: step.enigme ?? null,
            intro_answer: step.answer ?? null,
          })
          .eq("id", session_id);
      } else if (idx >= 1 && idx <= 9) {
        const objInfo = TEMPLATE_OBJECTS[idx - 1];
        const dbObj = objByPhysical.get(objInfo.physical_id);
        if (!dbObj) continue;

        const stepType = step.type === "epreuve" ? "epreuve" : "enigme";
        stepsToInsert.push({
          object_id: dbObj.id,
          text_narratif: step.text_narratif ?? "",
          enigme: step.enigme ?? null,
          answer: stepType === "epreuve" ? null : (step.answer ?? null),
          type: stepType,
          order: idx,
        });

        if (step.narrative_name) {
          narrativeUpdates.push({ id: dbObj.id, narrative_name: step.narrative_name });
        }
      } else if (idx === 10) {
        const coffret = objByPhysical.get("OBJ-09");
        if (coffret && step.text_narratif) {
          await supabase
            .from("objects")
            .update({ description: step.text_narratif })
            .eq("id", coffret.id);
        }
      }
    }

    if (stepsToInsert.length > 0) {
      const { error: stepsErr } = await supabase.from("steps").insert(stepsToInsert);
      if (stepsErr) {
        return NextResponse.json<ApiResponse>(
          { data: null, error: `Failed to save steps: ${stepsErr.message}` },
          { status: 500 }
        );
      }
    }

    for (const upd of narrativeUpdates) {
      await supabase.from("objects").update({ narrative_name: upd.narrative_name }).eq("id", upd.id);
    }

    // Auto-assign epreuve steps to guardians
    const { data: epreuveSteps } = await supabase
      .from("steps")
      .select("id, object_id, type")
      .in("object_id", objectIds)
      .eq("type", "epreuve");

    if (epreuveSteps && epreuveSteps.length > 0) {
      const { data: guardians } = await supabase
        .from("staff_members")
        .select("id")
        .eq("session_id", session_id)
        .order("name");

      if (guardians) {
        for (let i = 0; i < Math.min(epreuveSteps.length, guardians.length); i++) {
          await supabase
            .from("staff_members")
            .update({ assigned_step_id: epreuveSteps[i].id })
            .eq("id", guardians[i].id);
        }
      }
    }

    console.log("Scenario generated:", stepsToInsert.length, "steps for session", session_id);

    return NextResponse.json<ApiResponse>({
      data: { success: true, steps_count: stepsToInsert.length + 2 },
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

// ── AI call helper with timeout + retry ──
async function callAI(
  apiKey: string,
  prompt: string,
  attempt = 0,
): Promise<Array<Record<string, string | null>>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API ${res.status}: ${err.slice(0, 200)}`);
    }

    const result = await res.json();
    const text = result.content?.[0]?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed.steps ?? parsed.stages ?? []) as Array<Record<string, string | null>>;
  } catch (err) {
    clearTimeout(timeout);

    if (attempt < MAX_RETRIES) {
      console.log(`[SCENARIO] Retry ${attempt + 1}/${MAX_RETRIES}:`, (err as Error).message);
      return callAI(apiKey, prompt, attempt + 1);
    }

    throw err;
  }
}
