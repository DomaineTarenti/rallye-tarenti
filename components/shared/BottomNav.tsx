"use client";

import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Lightbulb, QrCode, Trophy } from "lucide-react";

interface BottomNavProps {
  onHint?: () => void;
  onJournal?: () => void;
  onRank?: () => void;
}

const NAV_ITEMS = [
  { id: "journal", label: "Journal", icon: BookOpen, href: null },
  { id: "hint", label: "Hint", icon: Lightbulb, href: null },
  { id: "scan", label: "Scan", icon: QrCode, href: "/scan" },
  { id: "rank", label: "Rank", icon: Trophy, href: null },
] as const;

export function BottomNav({ onHint, onJournal, onRank }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleTap(item: (typeof NAV_ITEMS)[number]) {
    if (item.id === "hint" && onHint) { onHint(); return; }
    if (item.id === "journal" && onJournal) { onJournal(); return; }
    if (item.id === "rank" && onRank) { onRank(); return; }
    if (item.href) router.push(item.href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-deep/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pb-5 pt-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href ? pathname === item.href : false;
          const Icon = item.icon;
          const isScan = item.id === "scan";

          if (isScan) {
            return (
              <button
                key={item.id}
                onClick={() => handleTap(item)}
                className="group -mt-5 flex flex-col items-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30 transition-transform active:scale-95">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className="mt-1 text-[10px] font-medium text-primary">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleTap(item)}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <Icon
                className={`h-5 w-5 transition-colors ${
                  active ? "text-primary" : "text-gray-500"
                }`}
              />
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-primary" : "text-gray-500"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
