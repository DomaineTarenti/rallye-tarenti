"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lock, Check, Hexagon, QrCode, Star } from "lucide-react";
import { Button, Card } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import { getRank } from "@/lib/scoring";

export default function MapPage() {
  const router = useRouter();
  const team = usePlayerStore((s) => s.team);
  const teamCharacter = usePlayerStore((s) => s.teamCharacter);
  const steps = usePlayerStore((s) => s.steps);
  const objects = usePlayerStore((s) => s.objects);
  const currentStepIndex = usePlayerStore((s) => s.currentStepIndex);
  const score = usePlayerStore((s) => s.score);
  const progress = usePlayerStore((s) => s.progress);

  const activeRef = useRef<HTMLDivElement>(null);
  const teamColor = teamCharacter?.color ?? "#7F77DD";
  const rank = getRank(score);

  const completedCount = progress.filter((p) => p.status === "completed").length;
  const allDone = steps.length > 0 && completedCount === steps.length;

  // Auto-scroll to active node
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  if (!team) { router.push("/"); return null; }

  // Get object name for a step
  function getObjectName(stepIdx: number): string {
    const step = steps[stepIdx];
    if (!step) return `Chapter ${stepIdx + 1}`;
    const obj = objects.find((o) => o.id === step.object_id);
    return obj?.name ?? `Chapter ${stepIdx + 1}`;
  }

  function getStepStatus(idx: number): "completed" | "active" | "locked" {
    const step = steps[idx];
    if (!step) return "locked";
    const p = progress.find((pr) => pr.step_id === step.id);
    return (p?.status as "completed" | "active" | "locked") ?? "locked";
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/5 bg-deep/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-bold">The Treasure Path</h1>
          <div className="flex items-center gap-1.5 text-amber">
            <Hexagon className="h-4 w-4" />
            <span className="text-sm font-bold">{score} RP</span>
          </div>
        </div>
      </div>

      {/* ── Map path ── */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto flex max-w-xs flex-col items-center">
          {steps.map((step, idx) => {
            const status = getStepStatus(idx);
            const isActive = status === "active";
            const isCompleted = status === "completed";
            const isLast = idx === steps.length - 1;
            const objName = getObjectName(idx);
            // Zigzag: alternate left/right offset
            const offset = idx % 2 === 0 ? -30 : 30;

            return (
              <div key={step.id} className="flex w-full flex-col items-center">
                {/* Connector line from previous */}
                {idx > 0 && (
                  <div className="relative h-12 w-full">
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 48" preserveAspectRatio="none">
                      <path
                        d={`M ${100 + (idx % 2 === 0 ? 30 : -30)} 0 Q 100 24 ${100 + offset} 48`}
                        fill="none"
                        stroke={isCompleted || isActive ? teamColor : "#ffffff15"}
                        strokeWidth={isCompleted ? 3 : 2}
                        strokeDasharray={isCompleted ? "none" : "6 4"}
                        className={isCompleted ? "transition-all duration-1000" : ""}
                      />
                    </svg>
                  </div>
                )}

                {/* Node */}
                <div
                  ref={isActive ? activeRef : null}
                  className="relative flex flex-col items-center"
                  style={{ transform: `translateX(${offset}px)` }}
                >
                  {/* "YOU ARE HERE" badge */}
                  {isActive && (
                    <div className="mb-2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: teamColor }}>
                      You are here
                    </div>
                  )}

                  {/* Circle node */}
                  <div
                    className={`flex items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted
                        ? "h-14 w-14 border-transparent text-white"
                        : isActive
                        ? "h-16 w-16 animate-node-pulse border-transparent text-white"
                        : "h-12 w-12 border-white/10 text-gray-600"
                    }`}
                    style={{
                      backgroundColor: isCompleted || isActive ? teamColor : "rgba(255,255,255,0.03)",
                      ["--pulse-color" as string]: teamColor + "50",
                    }}
                  >
                    {isCompleted ? (
                      <Check className="h-6 w-6" />
                    ) : isLast ? (
                      // Treasure chest SVG
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                        <rect x="3" y="11" width="18" height="10" rx="2" fillOpacity={isActive ? 1 : 0.4} />
                        <path d="M5 11V7a7 7 0 0114 0v4" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity={isActive ? 1 : 0.4} />
                        <circle cx="12" cy="16" r="2" fill={isActive ? teamColor : "#666"} />
                      </svg>
                    ) : isActive ? (
                      <span className="text-lg font-bold">{idx + 1}</span>
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </div>

                  {/* Stars for completed steps */}
                  {isCompleted && (
                    <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star key={s} className="h-3 w-3" fill={teamColor} stroke="none" />
                      ))}
                    </div>
                  )}

                  {/* Object name */}
                  <p className={`mt-1.5 max-w-[140px] text-center text-[11px] leading-tight ${
                    isCompleted ? "font-medium text-gray-300"
                    : isActive ? "font-bold text-white"
                    : "text-gray-600"
                  }`}>
                    {objName}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom info card ── */}
      <div className="border-t border-white/5 bg-surface px-4 pb-6 pt-4">
        <Card className="mb-4 bg-deep">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Progress</p>
              <p className="font-bold text-white">{completedCount} / {steps.length} chapters</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Rank Points</p>
              <div className="flex items-center gap-1 text-amber">
                <Hexagon className="h-4 w-4" />
                <span className="font-bold">{score}</span>
              </div>
            </div>
            {rank.key && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Rank</p>
                <p className="font-bold text-primary">{rank.label}</p>
              </div>
            )}
          </div>
        </Card>

        {allDone ? (
          <Button onClick={() => router.push("/")} size="lg" className="w-full" variant="secondary">
            Return Home
          </Button>
        ) : (
          <Button onClick={() => router.push("/scan")} size="lg" className="w-full">
            <QrCode className="mr-2 h-5 w-5" />
            Continue the Adventure
          </Button>
        )}
      </div>
    </main>
  );
}
