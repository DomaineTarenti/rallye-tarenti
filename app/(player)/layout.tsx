"use client";

import { useApplyTheme } from "@/lib/theme";
import { OfflineBanner } from "@/components/shared";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useApplyTheme();
  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
}
