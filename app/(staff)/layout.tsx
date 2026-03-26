"use client";

import { useApplyTheme } from "@/lib/theme";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useApplyTheme();
  return <>{children}</>;
}
