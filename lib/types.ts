// ─── Organization (white-label client) ───────────────────────────
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
}

// ─── Session (une chasse au trésor) ──────────────────────────────
export type SessionStatus = "draft" | "active" | "paused" | "completed";

export interface Session {
  id: string;
  org_id: string;
  name: string;
  code: string; // code court pour rejoindre
  status: SessionStatus;
  theme: string | null;
  duration_minutes: number;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
  started_at: string | null;
  intro_text: string | null;
}

// ─── Object (objet physique avec QR) ─────────────────────────────
export interface QuestObject {
  id: string;
  session_id: string;
  name: string;
  qr_code_id: string;
  order: number;
  description: string | null;
  model_url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_final: boolean;
  physical_id: string | null;
  created_at: string;
}

// ─── Step (étape d'une quête) ────────────────────────────────────
export type StepType = "enigme" | "epreuve" | "navigation";

export interface Step {
  id: string;
  object_id: string;
  text_narratif: string;
  enigme: string | null;
  answer: string | null;
  photo_indice_url: string | null;
  type: StepType;
  order: number;
  created_at: string;
}

// ─── Team (équipe de joueurs) ────────────────────────────────────
export type TeamStatus = "waiting" | "playing" | "finished";

export type TeamRank = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface Team {
  id: string;
  session_id: string;
  name: string;
  character: string | null;
  avatar_url: string | null;
  status: TeamStatus;
  final_score: number | null;
  rank: TeamRank | null;
  rank_label: string | null; // nom personnalisé par l'orga
  completion_time: number | null; // secondes
  certificate_url: string | null;
  locked: boolean;
  object_order: string[];
  created_at: string;
}

// ─── Team Progress (progression par étape) ───────────────────────
export type ProgressStatus = "locked" | "active" | "completed" | "skipped";

export type HintType = "narratif" | "photo" | "direct";

export interface TeamProgress {
  id: string;
  team_id: string;
  step_id: string;
  status: ProgressStatus;
  hints_used: number;
  hint_types: HintType[];
  time_on_step: number | null; // secondes
  epreuve_attempts: number;
  epreuve_success: boolean | null;
  completed_at: string | null;
  created_at: string;
}

// ─── Scoring config (par session) ────────────────────────────────
export interface RankThresholds {
  diamond: number;
  platinum: number;
  gold: number;
  silver: number;
  bronze: number;
}

export interface ScoringConfig {
  id: string;
  session_id: string;
  base_score: number;
  penalty_per_minute: number;
  penalty_per_hint: number;
  bonus_epreuve_success: number;
  rank_thresholds: RankThresholds;
  rank_labels: Record<string, string>; // ex: { diamond: "Légende", gold: "Héros" }
  created_at: string;
}

// ─── Staff Member ────────────────────────────────────────────────
export type StaffRole = "gardien" | "animateur" | "admin";

export interface StaffMember {
  id: string;
  session_id: string;
  user_id: string | null;
  name: string;
  role: StaffRole;
  assigned_step_id: string | null;
  created_at: string;
}

// ─── Theme config ────────────────────────────────────────────────
export interface ThemeConfig {
  primaryColor: string;
  primaryColorLight: string;
  primaryColorDark: string;
  logoUrl: string | null;
  appName: string;
}

// ─── Team character (totem + couleur choisis) ───────────────────
export interface TeamCharacter {
  animal: string;
  animalEmoji: string;
  color: string;
  warCry: string;
  teamCode: string;
}

// ─── Scan result ────────────────────────────────────────────────
export interface ScanResult {
  valid: boolean;
  reason?: "wrong_order" | "already_scanned" | "unknown" | "quest_complete";
  message?: string;
  step?: Step;
  object?: QuestObject;
}

// ─── Answer result ──────────────────────────────────────────────
export interface AnswerResult {
  correct: boolean;
  message: string;
}

// ─── API response helpers ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
}
