// ─── Session (un événement rallye) ───────────────────────────
export type SessionStatus = "draft" | "active" | "paused" | "completed";

export interface Session {
  id: string;
  name: string;
  code: string;
  status: SessionStatus;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
  started_at: string | null;
}

// ─── QuestObject (animal / point d'intérêt) ──────────────────
export interface QuestObject {
  id: string;
  session_id: string;
  name: string;
  emoji: string;
  order: number;
  description: string | null;
  latitude: number;
  longitude: number;
  is_final: boolean;
  created_at: string;
}

// ─── Step (question sur l'animal) ────────────────────────────
export interface Step {
  id: string;
  object_id: string;
  intro_text: string | null;
  question: string;
  answer: string;
  hint: string | null;
  fun_fact: string;
  order: number;
  created_at: string;
}

// ─── Team (équipe participante) ──────────────────────────────
export type TeamStatus = "waiting" | "playing" | "finished";

export interface Team {
  id: string;
  session_id: string;
  name: string;
  status: TeamStatus;
  completion_time: number | null;
  locked: boolean;
  access_code: string | null;
  is_precreated: boolean;
  started_at: string | null;
  created_at: string;
}

// ─── Team Progress (avancement par étape) ────────────────────
export type ProgressStatus = "locked" | "active" | "completed" | "skipped";

export interface TeamProgress {
  id: string;
  team_id: string;
  step_id: string;
  status: ProgressStatus;
  hints_used: number;
  completed_at: string | null;
  created_at: string;
}

// ─── Photo (prise à chaque étape) ────────────────────────────
export interface Photo {
  id: string;
  team_id: string;
  step_id: string | null;
  object_id: string | null;
  storage_url: string;
  created_at: string;
}

// ─── Theme config (cosmétique) ───────────────────────────────
export interface ThemeConfig {
  primaryColor: string;
  primaryColorLight: string;
  primaryColorDark: string;
  logoUrl: string | null;
  appName: string;
}

// ─── Answer result ───────────────────────────────────────────
export interface AnswerResult {
  correct: boolean;
  message: string;
  fun_fact?: string;
}

// ─── API response helpers ────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
}
