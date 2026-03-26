import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

// POST /api/scenario — générer un scénario via Claude API
export async function POST(req: NextRequest) {
  const { theme, num_steps, context } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json<ApiResponse>(
      { data: null, error: "ANTHROPIC_API_KEY non configurée" },
      { status: 500 }
    );
  }

  // TODO: appel Claude API pour générer le scénario
  // Placeholder response
  return NextResponse.json<ApiResponse>({
    data: {
      message: "Génération IA à implémenter",
      theme,
      num_steps,
      context,
    },
    error: null,
  });
}
