"use client";

import { QrCode } from "lucide-react";

export default function ObjectsPage() {
  return (
    <main className="min-h-[100dvh] px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <QrCode className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Objets & QR Codes</h1>
        </div>
        <p className="text-gray-400">Gérer les objets physiques et générer les QR codes</p>
        {/* TODO: CRUD objets + génération QR */}
      </div>
    </main>
  );
}
