import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ApiResponse } from "@/lib/types";

const PENALTIES = { narratif: 15, photo: 25, direct: 50 };
const HINT_TYPES = ["narratif", "photo", "direct"] as const;

interface HintResult {
  hint_type: "narratif" | "photo" | "direct";
  hint_text: string;
  penalty: number;
  hints_used: number;
}

async function generateHintWithAI(
  level: number,
  enigme: string,
  answer: string | null,
  narratif: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackHint(level, answer);

  const prompts: Record<number, string> = {
    1: `You are a game master for an immersive treasure hunt called "The Quest". A player is stuck on a riddle and needs a subtle hint. Rephrase the riddle in a slightly more explicit way WITHOUT revealing the answer. Stay in the narrative universe. Be concise (2-3 sentences max, in the same language as the riddle).

Riddle: ${enigme}
Context: ${narratif.slice(0, 200)}`,

    2: `You are a game master. A player needs a concrete directional hint for a riddle. Give a very specific clue that points toward the answer WITHOUT revealing it directly. Be concise (1-2 sentences, same language as the riddle).

Riddle: ${enigme}
Answer (DO NOT reveal this): ${answer}
Context: ${narratif.slice(0, 200)}`,

    3: `You are a game master reluctantly revealing the answer to a stuck player. Reveal the answer "${answer}" in an immersive, narrative way — as if an ancient guardian finally yielded. Be dramatic but concise (2-3 sentences, same language as the riddle).

Riddle: ${enigme}
Answer to reveal: ${answer}`,
  };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompts[level] }],
      }),
    });

    if (!res.ok) return fallbackHint(level, answer);

    const result = await res.json();
    const text = result.content?.[0]?.text?.trim();
    return text || fallbackHint(level, answer);
  } catch {
    return fallbackHint(level, answer);
  }
}

function fallbackHint(level: number, answer: string | null): string {
  if (level === 1) return "Re-read the narrative carefully — the answer hides in the details of the story.";
  if (level === 2) {
    if (answer) {
      const first = answer.length <= 3 ? answer[0] : answer.slice(0, Math.ceil(answer.length / 3));
      return `Think about something that starts with "${first}"...`;
    }
    return "Look around you for physical clues related to the riddle.";
  }
  return answer ? `The answer is: "${answer}". The guardian could no longer keep this secret.` : "Seek aid from a nearby Guardian.";
}

// POST /api/hint — request a hint (level 1, 2, or 3)
export async function POST(req: NextRequest) {
  const { team_id, step_id, hint_level } = await req.json();

  if (!team_id || !step_id) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "team_id and step_id required" },
      { status: 400 }
    );
  }

  const level = Math.min(3, Math.max(1, hint_level ?? 1));
  const hintType = HINT_TYPES[level - 1];
  const penalty = PENALTIES[hintType];

  const supabase = createServerClient();

  const [progressRes, stepRes] = await Promise.all([
    supabase.from("team_progress").select("*").eq("team_id", team_id).eq("step_id", step_id).single(),
    supabase.from("steps").select("*").eq("id", step_id).single(),
  ]);

  if (!progressRes.data || !stepRes.data) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "Step or progress not found" },
      { status: 404 }
    );
  }

  const progress = progressRes.data;
  const step = stepRes.data;

  // Check if this hint level was already used
  const usedTypes = progress.hint_types ?? [];
  if (usedTypes.includes(hintType)) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "This hint level has already been used." },
      { status: 400 }
    );
  }

  // Generate hint with AI
  const hintText = await generateHintWithAI(
    level,
    step.enigme ?? "",
    step.answer,
    step.text_narratif ?? ""
  );

  // Update progress
  const newHintsUsed = (progress.hints_used ?? 0) + 1;
  const updatedHintTypes = [...usedTypes, hintType];

  await supabase
    .from("team_progress")
    .update({ hints_used: newHintsUsed, hint_types: updatedHintTypes })
    .eq("team_id", team_id)
    .eq("step_id", step_id);

  const result: HintResult = {
    hint_type: hintType,
    hint_text: hintText,
    penalty,
    hints_used: newHintsUsed,
  };

  return NextResponse.json<ApiResponse<HintResult>>({ data: result, error: null });
}
