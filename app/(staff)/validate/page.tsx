"use client";

import { CheckCircle } from "lucide-react";

export default function ValidatePage() {
  return (
    <main className="min-h-[100dvh] px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Valider une épreuve</h1>
        </div>
        <p className="text-gray-400">Scanner ou sélectionner une équipe pour valider</p>
        {/* TODO: interface de validation staff */}
      </div>
    </main>
  );
}
