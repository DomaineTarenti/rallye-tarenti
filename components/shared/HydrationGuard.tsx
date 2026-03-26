"use client";

import { useSyncExternalStore } from "react";

/**
 * Prevents rendering children until the component has mounted on the client.
 * This avoids React hydration mismatches (Error #310) caused by
 * Zustand persist reading localStorage (which doesn't exist on the server).
 *
 * Uses useSyncExternalStore for correct concurrent mode behavior.
 */

const emptySubscribe = () => () => {};

export function HydrationGuard({ children }: { children: React.ReactNode }) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,  // client: mounted
    () => false  // server: not mounted
  );

  if (!isClient) return null;

  return <>{children}</>;
}
