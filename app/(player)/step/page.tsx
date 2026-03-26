"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/lib/store";
import { Loader } from "@/components/shared";

/**
 * /step — Transition screen after QR scan.
 * Sets the current step from scan data, then redirects to /play.
 * If answer was already validated via /play, redirects to /celebrate.
 */
export default function StepPage() {
  const router = useRouter();
  const currentStep = usePlayerStore((s) => s.currentStep);
  const team = usePlayerStore((s) => s.team);

  useEffect(() => {
    // Step data is set by /scan before navigating here.
    // Redirect to /play to show the enigma.
    const timer = setTimeout(() => {
      router.replace("/play");
    }, 500);
    return () => clearTimeout(timer);
  }, [router]);

  if (!team || !currentStep) {
    router.replace("/play");
    return null;
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center">
      <Loader text="Revealing the next chapter..." />
    </main>
  );
}
