"use client";

import { useApplyTheme } from "@/lib/theme";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useApplyTheme();
  return <>{children}</>;
}
