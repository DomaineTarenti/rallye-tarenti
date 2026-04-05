"use client";

import { useEffect, useState } from "react";
import { useApplyTheme } from "@/lib/theme";
import { OfflineBanner, HydrationGuard } from "@/components/shared";

function BatteryWarning() {
  const [batteryLow, setBatteryLow] = useState(false);

  useEffect(() => {
    if (!("getBattery" in navigator)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).getBattery().then((battery: any) => {
      const check = () => setBatteryLow(battery.level < 0.2 && !battery.charging);
      check();
      battery.addEventListener("levelchange", check);
      battery.addEventListener("chargingchange", check);
      return () => {
        battery.removeEventListener("levelchange", check);
        battery.removeEventListener("chargingchange", check);
      };
    }).catch(() => {/* non supporté */});
  }, []);

  if (!batteryLow) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-center gap-2 bg-orange-500/95 px-4 py-2 text-xs font-semibold text-white">
      🔋 Batterie faible — branchez votre téléphone pour ne pas perdre votre progression
    </div>
  );
}

export default function RallyLayout({ children }: { children: React.ReactNode }) {
  useApplyTheme();
  return (
    <>
      <OfflineBanner />
      <BatteryWarning />
      <HydrationGuard>{children}</HydrationGuard>
    </>
  );
}
