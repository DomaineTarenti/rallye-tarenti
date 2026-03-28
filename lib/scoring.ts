import type { TeamRank } from "./types";

export interface HintUsage {
  type: string; // "narratif" | "photo" | "direct"
}

export interface Rank {
  key: TeamRank | null;
  label: string;
  color: string;
  score: number;
}

/**
 * Calculate final score.
 * Base 1000 - time penalty (2pts/min) - hint penalties.
 */
export function calculateScore(
  startTime: number,
  endTime: number,
  hints: HintUsage[],
): number {
  const minutes = Math.floor((endTime - startTime) / 1000 / 60);
  const timePenalty = minutes * 2;

  const hintPenalty = hints.reduce((total, h) => {
    if (h.type === "narratif") return total + 15;
    if (h.type === "photo") return total + 25;
    if (h.type === "direct") return total + 50;
    return total + 15;
  }, 0);

  return Math.max(0, 1000 - timePenalty - hintPenalty);
}

export function getRank(score: number): Rank {
  if (score >= 950) return { key: "diamond", label: "Maîtres du Labyrinthe", color: "#7F77DD", score };
  if (score >= 850) return { key: "platinum", label: "Gardiens du Secret", color: "#5DCAA5", score };
  if (score >= 700) return { key: "gold", label: "Chevaliers de l'Ordre", color: "#EF9F27", score };
  if (score >= 500) return { key: "silver", label: "Éclaireurs Aguerris", color: "#B4B2A9", score };
  if (score >= 300) return { key: "bronze", label: "Apprentis Explorateurs", color: "#D85A30", score };
  return { key: null, label: "Unranked", color: "#666", score };
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
