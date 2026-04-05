"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  Menu,
  X,
  Compass,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "New Session", href: "/admin/sessions/new", icon: Plus },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // La page de login gère son propre layout
  if (pathname === "/admin/login") return <>{children}</>;

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  }

  const sessionMatch = pathname.match(/\/admin\/sessions\/([^/]+)/);
  const sessionId = sessionMatch ? sessionMatch[1] : null;
  const isNewSession = pathname === "/admin/sessions/new";

  const sessionSubnav = sessionId && !isNewSession ? [
    { label: "Équipes", href: `/admin/sessions/${sessionId}/teams` },
    { label: "Live", href: `/admin/sessions/${sessionId}/live` },
    { label: "GPS", href: `/admin/sessions/${sessionId}/gps` },
    { label: "Scénario", href: `/admin/sessions/${sessionId}/scenario` },
    { label: "Photos", href: `/admin/sessions/${sessionId}/photos` },
    { label: "Résultats", href: `/admin/sessions/${sessionId}/results` },
  ] : null;

  function NavContent({ onNav }: { onNav?: () => void }) {
    return (
      <>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => { router.push(item.href); onNav?.(); }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-indigo-50 font-semibold text-indigo-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
        {sessionSubnav && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Session</p>
            {sessionSubnav.map((item) => (
              <button
                key={item.href}
                onClick={() => { router.push(item.href); onNav?.(); }}
                className={`flex w-full rounded-lg px-3 py-2 text-sm transition-colors ${
                  pathname === item.href ? "bg-indigo-50 font-semibold text-indigo-700" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Desktop sidebar */}
      <aside className="relative hidden w-60 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-5">
          <Compass className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-bold text-gray-900">Rallye Tarenti</span>
          <span className="ml-auto rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">ADMIN</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 w-60 border-t border-gray-100 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
        <nav className="space-y-0.5 p-3 pb-16">
          <NavContent />
        </nav>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <aside className="relative h-full w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-5">
              <span className="text-sm font-bold">Rallye Tarenti Admin</span>
              <button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <nav className="space-y-0.5 p-3 pb-16">
              <NavContent onNav={() => setSidebarOpen(false)} />
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5 text-gray-600" /></button>
          <span className="text-sm font-bold">Rallye Tarenti Admin</span>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
