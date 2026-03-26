import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

// POST /api/scenario — generate scenario via Claude API
export async function POST(req: NextRequest) {
  const { theme, num_steps, context, session_name } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const prompt = `You are a creative game designer for "The Quest", an interactive treasure hunt app.
Generate a complete scenario for a treasure hunt with the following parameters:

- Session name: ${session_name || "Untitled"}
- Theme: ${theme || "A mysterious adventure"}
- Number of stages: ${num_steps || 5}
- Additional context: ${context || "None"}

For each stage, provide:
1. object_name: A dramatic, thematic name for the physical object (in French)
2. object_description: A short description of the physical object (1 sentence, in French)
3. type: "enigme" for most, "epreuve" for 1 physical challenge
4. text_narratif: An immersive narrative text (3-4 sentences in French, rich and atmospheric)
5. enigme: The riddle or challenge description (in French)
6. answer: The answer (single word or short phrase, lowercase, in French). Null for "epreuve" type.

Return ONLY valid JSON in this exact format:
{
  "stages": [
    {
      "object_name": "...",
      "object_description": "...",
      "type": "enigme",
      "text_narratif": "...",
      "enigme": "...",
      "answer": "..."
    }
  ]
}`;

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
        max_tokens: 4096,
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
    const text =
      result.content?.[0]?.text ?? "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json<ApiResponse>(
        { data: null, error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const scenario = JSON.parse(jsonMatch[0]);

    return NextResponse.json<ApiResponse>({
      data: scenario,
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
