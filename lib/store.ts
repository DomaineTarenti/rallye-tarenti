import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Session, Team, Step, TeamProgress, QuestObject, ThemeConfig, Photo } from "./types";

// ─── Player store ────────────────────────────────────────────
interface PlayerState {
  _hasHydrated: boolean;
  session: Session | null;
  team: Team | null;
  currentStep: Step | null;
  currentStepIndex: number;   // 0-based index parmi les steps triés
  steps: Step[];
  objects: QuestObject[];
  progress: TeamProgress[];
  photos: Photo[];

  setHasHydrated: (v: boolean) => void;
  setSession: (session: Session | null) => void;
  setTeam: (team: Team | null) => void;
  setCurrentStep: (step: Step | null) => void;
  setCurrentStepIndex: (i: number) => void;
  setSteps: (steps: Step[]) => void;
  setObjects: (objects: QuestObject[]) => void;
  setProgress: (progress: TeamProgress[]) => void;
  setPhotos: (photos: Photo[]) => void;
  addPhoto: (photo: Photo) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      session: null,
      team: null,
      currentStep: null,
      currentStepIndex: 0,
      steps: [],
      objects: [],
      progress: [],
      photos: [],

      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setSession: (session) => set({ session }),
      setTeam: (team) => set({ team }),
      setCurrentStep: (step) => set({ currentStep: step }),
      setCurrentStepIndex: (i) => set({ currentStepIndex: i }),
      setSteps: (steps) => set({ steps }),
      setObjects: (objects) => set({ objects }),
      setProgress: (progress) => set({ progress }),
      setPhotos: (photos) => set({ photos }),
      addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo] })),

      reset: () =>
        set({
          session: null,
          team: null,
          currentStep: null,
          currentStepIndex: 0,
          steps: [],
          objects: [],
          progress: [],
          photos: [],
        }),
    }),
    {
      name: "tarenti-player",
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
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// ─── Theme store ─────────────────────────────────────────────
interface ThemeState {
  theme: ThemeConfig;
  setTheme: (theme: Partial<ThemeConfig>) => void;
}

const defaultTheme: ThemeConfig = {
  primaryColor: "#2D7D46",
  primaryColorLight: "#4CAF70",
  primaryColorDark: "#1B5E30",
  logoUrl: null,
  appName: "Rallye Tarenti",
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: defaultTheme,
  setTheme: (partial) =>
    set((state) => ({ theme: { ...state.theme, ...partial } })),
}));
