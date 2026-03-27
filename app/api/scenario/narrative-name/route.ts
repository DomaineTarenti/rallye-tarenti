import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

// POST /api/scenario/narrative-name — generate a narrative name for one object
export async function POST(req: NextRequest) {
  const { base_name, theme, session_name } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const prompt = `You are a creative game designer for "The Quest", an interactive treasure hunt.

Session: ${session_name || "Untitled"}
Theme: ${theme || "A mysterious adventure"}
Base object name: "${base_name}"

Generate ONE immersive narrative name for this object that fits the theme.
The narrative name should start with the base name and add evocative adjectives or context.

Examples for a Mediterranean antiquity theme:
- "La Fiole" → "La Fiole d'Huile Sacrée"
- "Le Fragment" → "Le Fragment de Mosaïque Brisée"
- "Le Sceau" → "Le Sceau du Proconsul"

Return ONLY valid JSON: {"narrative_name": "..."}`;

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
        max_tokens: 256,
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

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json<ApiResponse>({ data: parsed, error: null });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: `AI generation failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
