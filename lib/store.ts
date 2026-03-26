import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Session,
  Team,
  Step,
  TeamProgress,
  QuestObject,
  ThemeConfig,
  TeamCharacter,
} from "./types";

// ─── Player store ────────────────────────────────────────────────
interface PlayerState {
  session: Session | null;
  team: Team | null;
  teamCharacter: TeamCharacter | null;
  currentStep: Step | null;
  steps: Step[];
  objects: QuestObject[];
  progress: TeamProgress[];
  currentStepIndex: number;
  score: number;

  setSession: (session: Session | null) => void;
  setTeam: (team: Team | null) => void;
  setTeamCharacter: (tc: TeamCharacter | null) => void;
  setCurrentStep: (step: Step | null) => void;
  setSteps: (steps: Step[]) => void;
  setObjects: (objects: QuestObject[]) => void;
  setProgress: (progress: TeamProgress[]) => void;
  setCurrentStepIndex: (index: number) => void;
  setScore: (score: number) => void;
  advanceStep: () => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      session: null,
      team: null,
      teamCharacter: null,
      currentStep: null,
      steps: [],
      objects: [],
      progress: [],
      currentStepIndex: 0,
      score: 1000,

      setSession: (session) => set({ session }),
      setTeam: (team) => set({ team }),
      setTeamCharacter: (tc) => set({ teamCharacter: tc }),
      setCurrentStep: (step) => set({ currentStep: step }),
      setSteps: (steps) => set({ steps }),
      setObjects: (objects) => set({ objects }),
      setProgress: (progress) => set({ progress }),
      setCurrentStepIndex: (index) => {
        const { steps } = get();
        set({ currentStepIndex: index, currentStep: steps[index] ?? null });
      },
      setScore: (score) => set({ score }),

      advanceStep: () => {
        const { currentStepIndex, steps } = get();
        const next = currentStepIndex + 1;
        if (next < steps.length) {
          set({ currentStepIndex: next, currentStep: steps[next] });
        }
      },

      reset: () =>
        set({
          session: null,
          team: null,
          teamCharacter: null,
          currentStep: null,
          steps: [],
          objects: [],
          progress: [],
          currentStepIndex: 0,
          score: 1000,
        }),
    }),
    {
      name: "quest-player",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      version: 1,
    }
  )
);

// ─── Theme store ─────────────────────────────────────────────────
interface ThemeState {
  theme: ThemeConfig;
  setTheme: (theme: Partial<ThemeConfig>) => void;
}

const defaultTheme: ThemeConfig = {
  primaryColor: "#7C3AED",
  primaryColorLight: "#A78BFA",
  primaryColorDark: "#5B21B6",
  logoUrl: null,
  appName: "The Quest",
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: defaultTheme,
  setTheme: (partial) =>
    set((state) => ({ theme: { ...state.theme, ...partial } })),
}));
