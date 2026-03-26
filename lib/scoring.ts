import type { ScoringConfig, TeamProgress, TeamRank } from "./types";

export interface RankLabels {
  diamond?: string;
  platinum?: string;
  gold?: string;
  silver?: string;
  bronze?: string;
}

export interface Rank {
  key: TeamRank | null;
  label: string;
  score: number;
}

const HINT_PENALTIES: Record<string, number> = {
  narratif: 15,
  photo: 25,
  direct: 50,
};

export function calculateScore(
  config: ScoringConfig | null,
  progress: TeamProgress[]
): number {
  const base = config?.base_score ?? 1000;
  let score = base;

  for (const p of progress) {
    // Hint penalties by type
    if (p.hint_types && p.hint_types.length > 0) {
      for (const ht of p.hint_types) {
        score -= HINT_PENALTIES[ht] ?? 15;
      }
    }

    // Epreuve bonuses/penalties
    if (p.epreuve_success === true) {
      score += config?.bonus_epreuve_success ?? 50;
    } else if (p.epreuve_success === false) {
      score -= 25;
    }

    // First-try bonus for completed enigme steps
    if (p.status === "completed") {
      if (p.epreuve_attempts === 0 || p.epreuve_attempts === 1) {
        // Assume epreuve_attempts tracks answer attempts too
        // 0 or 1 attempt = first try
        score += 30;
      } else if (p.epreuve_attempts === 2) {
        score += 15;
      }
    }
  }

  // Time penalty: -1pt per minute over estimated duration
  // (Would need session start time and duration_minutes to compute,
  //  applied at final scoring — not per-step)

  return Math.max(0, score);
}

export function getRank(
  score: number,
  customLabels?: RankLabels
): Rank {
  if (score >= 970) {
    return {
      key: "diamond",
      label: customLabels?.diamond ?? "Diamond",
      score,
    };
  }
  if (score >= 900) {
    return {
      key: "platinum",
      label: customLabels?.platinum ?? "Platinum",
      score,
    };
  }
  if (score >= 750) {
    return {
      key: "gold",
      label: customLabels?.gold ?? "Gold",
      score,
    };
  }
  if (score >= 600) {
    return {
      key: "silver",
      label: customLabels?.silver ?? "Silver",
      score,
    };
  }
  if (score >= 400) {
    return {
      key: "bronze",
      label: customLabels?.bronze ?? "Bronze",
      score,
    };
  }
  return { key: null, label: "Unranked", score };
}
