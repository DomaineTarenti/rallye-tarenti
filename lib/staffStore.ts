import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface StaffState {
  staffId: string | null;
  staffName: string | null;
  sessionId: string | null;
  sessionCode: string | null;
  sessionName: string | null;
  assignedStepId: string | null;
  validationCode: string | null;
  teamsValidated: number;

  setStaff: (data: {
    staffId: string;
    staffName: string;
    sessionId: string;
    sessionCode: string;
    sessionName: string;
    assignedStepId: string | null;
    validationCode: string | null;
  }) => void;
  incrementValidated: () => void;
  reset: () => void;
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set, get) => ({
      staffId: null,
      staffName: null,
      sessionId: null,
      sessionCode: null,
      sessionName: null,
      assignedStepId: null,
      validationCode: null,
      teamsValidated: 0,

      setStaff: (data) => set({ ...data, teamsValidated: 0 }),
      incrementValidated: () => set({ teamsValidated: get().teamsValidated + 1 }),
      reset: () =>
        set({
          staffId: null,
          staffName: null,
          sessionId: null,
          sessionCode: null,
          sessionName: null,
          assignedStepId: null,
          validationCode: null,
          teamsValidated: 0,
        }),
    }),
    {
      name: "quest-staff",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
);
