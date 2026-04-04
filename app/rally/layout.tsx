"use client";

import { useApplyTheme } from "@/lib/theme";
import { OfflineBanner, HydrationGuard } from "@/components/shared";

export default function RallyLayout({ children }: { children: React.ReactNode }) {
  useApplyTheme();
  return (
    <>
      <OfflineBanner />
      <HydrationGuard>{children}</HydrationGuard>
    </>
  );
}
