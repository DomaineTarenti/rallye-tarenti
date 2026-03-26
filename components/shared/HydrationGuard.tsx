"use client";

import { useEffect, useState } from "react";
import { usePlayerStore } from "@/lib/store";

/**
 * Prevents rendering children until Zustand persist has rehydrated
 * from localStorage. This avoids React hydration mismatches (Error #310)
 * between server (empty store) and client (populated store).
 */
export function HydrationGuard({ children }: { children: React.ReactNode }) {
  const hasHydrated = usePlayerStore((s) => s._hasHydrated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Wait for both: component mount AND store rehydration
  if (!mounted || !hasHydrated) return null;

  return <>{children}</>;
}
