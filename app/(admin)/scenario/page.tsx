"use client";

import { BookOpen } from "lucide-react";

export default function ScenarioPage() {
  return (
    <main className="min-h-[100dvh] px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Scénario</h1>
        </div>
        <p className="text-gray-400">Créer et éditer le scénario de la chasse au trésor</p>
        {/* TODO: éditeur de scénario + génération IA */}
      </div>
    </main>
  );
}
