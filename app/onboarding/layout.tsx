"use client";

import { useApplyTheme } from "@/lib/theme";
import { HydrationGuard } from "@/components/shared";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  useApplyTheme();
  return <HydrationGuard>{children}</HydrationGuard>;
}
