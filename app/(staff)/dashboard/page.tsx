"use client";

import { LayoutDashboard } from "lucide-react";

export default function StaffDashboardPage() {
  return (
    <main className="min-h-[100dvh] px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Dashboard Staff</h1>
        </div>
        <p className="text-gray-400">Liste des équipes actives</p>
        {/* TODO: liste temps réel des équipes et leur progression */}
      </div>
    </main>
  );
}
