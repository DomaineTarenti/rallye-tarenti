"use client";

import { CalendarDays } from "lucide-react";

export default function SessionsPage() {
  return (
    <main className="min-h-[100dvh] px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Sessions</h1>
          </div>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium hover:bg-primary-dark">
            Nouvelle session
          </button>
        </div>
        {/* TODO: liste des sessions avec CRUD */}
      </div>
    </main>
  );
}
