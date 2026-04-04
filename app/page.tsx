"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlayerStore } from "@/lib/store";
import { Loader } from "@/components/shared";
import type { ApiResponse } from "@/lib/types";

function HomeContent() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  const storedTeam = usePlayerStore((s) => s.team);
  const storedSession = usePlayerStore((s) => s.session);
  const hasHydrated = usePlayerStore((s) => s._hasHydrated);

  // Si une équipe est déjà en cours, reprendre directement
  useEffect(() => {
    if (!hasHydrated) return;
    if (storedTeam && storedSession && storedTeam.status === "playing") {
      router.replace("/rally");
    }
  }, [hasHydrated, storedTeam, storedSession, router]);

  // Auto-remplissage depuis URL (?team=FAM01)
  useEffect(() => {
    const teamParam = params.get("team");
    if (teamParam) setCode(teamParam.toUpperCase());
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: trimmed }),
      });
      const json: ApiResponse = await res.json();

      if (!res.ok || json.error || !json.data) {
        setError("Code non reconnu. Demandez votre code à l'accueil.");
        setLoading(false);
        return;
      }

      const data = json.data as Record<string, unknown>;
      const store = usePlayerStore.getState();

      store.setSession(data.session as never);
      store.setTeam(data.team as never);
      store.setObjects(data.objects as never[]);
      store.setSteps(data.steps as never[]);
      store.setProgress(data.progress as never[]);

      // Équipe déjà terminée → résultats
      if ((data.team as Record<string, unknown>).status === "finished") {
        router.push("/finish");
        return;
      }

      router.push("/rally");
    } catch {
      setError("Erreur de connexion. Vérifiez votre réseau.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-deep">
      {/* Logo / Illustration */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="text-7xl">🌿</div>
        <h1 className="text-center text-3xl font-black tracking-tight text-white">
          BIENVENUE AU
          <br />
          <span className="text-primary">RALLYE TARENTI</span>
        </h1>
        <p className="text-center text-sm text-gray-400">
          Domaine Tarenti — Tunisie
        </p>
      </div>

      {/* Instruction */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-surface px-6 py-4 text-center w-full max-w-sm">
        <p className="text-sm text-gray-300">
          Demandez votre <span className="font-bold text-white">code équipe</span> à l&apos;accueil
          puis entrez-le ci-dessous pour commencer l&apos;aventure !
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          id="team-code"
          name="team-code"
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          placeholder="FAM01"
          maxLength={10}
          autoComplete="off"
          autoCapitalize="characters"
          className="w-full rounded-xl border border-white/10 bg-surface px-4 py-4 text-center text-2xl font-mono font-bold tracking-widest text-white placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          autoFocus
          disabled={loading}
        />

        {error && (
          <p className="text-center text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={!code.trim() || loading}
          className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-white transition-all hover:bg-primary-dark active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Connexion..." : "C'est parti ! 🚀"}
        </button>
      </form>

      <p className="mt-10 text-xs text-gray-600">
        7 animaux à découvrir · Photos souvenir incluses
      </p>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-[100dvh] items-center justify-center bg-deep">
        <Loader text="Chargement..." />
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
