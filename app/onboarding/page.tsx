"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/lib/store";
import { Loader } from "@/components/shared";
import type { ApiResponse, Team } from "@/lib/types";

const ANIMALS = ["🐐", "🐄", "🫏", "🐷", "🌿", "🐔", "🐇"];

export default function OnboardingPage() {
  const router = useRouter();
  const team = usePlayerStore((s) => s.team);
  const hasHydrated = usePlayerStore((s) => s._hasHydrated);
  const setTeam = usePlayerStore((s) => s.setTeam);

  const [step, setStep] = useState<"welcome" | "name" | "rules" | "go">("welcome");
  const [teamName, setTeamName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!team) { router.replace("/"); return; }
    // Pré-remplir avec le nom actuel si pas encore personnalisé
    if (team.name) setTeamName(team.name);
  }, [hasHydrated, team, router]);

  async function saveName() {
    if (!team || !teamName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: team.id, name: teamName.trim() }),
      });
      const json: ApiResponse<Team> = await res.json();
      if (!res.ok || json.error) {
        setError("Impossible d'enregistrer le nom. Réessayez.");
        setSaving(false);
        return;
      }
      if (json.data) setTeam(json.data);
      setStep("rules");
    } catch {
      setError("Erreur de connexion.");
    }
    setSaving(false);
  }

  if (!hasHydrated || !team) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-deep">
        <Loader text="Chargement..." />
      </main>
    );
  }

  // ─── Écran 1 : Bienvenue ──────────────────────────────────────
  if (step === "welcome") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-deep px-6 text-center">
        {/* Animaux défilants */}
        <div className="mb-6 flex gap-3 text-4xl">
          {ANIMALS.map((a, i) => (
            <span
              key={i}
              className="inline-block"
              style={{ animation: `bounce-in 0.4s ease-out ${i * 0.08}s both` }}
            >
              {a}
            </span>
          ))}
        </div>

        <h1 className="mb-3 text-3xl font-black text-white leading-tight">
          Bienvenue dans le<br />
          <span className="text-primary">Grand Rallye Tarenti</span> !
        </h1>

        <p className="mb-8 max-w-sm text-base text-gray-300 leading-relaxed">
          Le Domaine Tarenti vous ouvre ses portes pour une aventure unique au cœur de la nature.
          Sept animaux vous attendent — saurez-vous les retrouver tous ?
        </p>

        <button
          onClick={() => setStep("name")}
          className="w-full max-w-sm rounded-xl bg-primary py-4 text-lg font-bold text-white transition-all active:scale-95"
        >
          On commence ! 🚀
        </button>

        <p className="mt-6 text-xs text-gray-600">
          Domaine Tarenti · Tunisie
        </p>

        <style>{`
          @keyframes bounce-in {
            0%   { transform: translateY(-30px) scale(0.5); opacity: 0; }
            70%  { transform: translateY(4px) scale(1.1); }
            100% { transform: translateY(0) scale(1); opacity: 1; }
          }
        `}</style>
      </main>
    );
  }

  // ─── Écran 2 : Choisir le nom ────────────────────────────────
  if (step === "name") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-deep px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="text-6xl mb-4">🏷️</div>
            <h2 className="text-2xl font-black text-white mb-2">
              Votre nom d&apos;explorateurs
            </h2>
            <p className="text-sm text-gray-400">
              Choisissez un nom qui vous représente — il apparaîtra sur vos photos souvenir !
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={teamName}
              onChange={(e) => { setTeamName(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && teamName.trim() && saveName()}
              placeholder="Ex: Les Aventuriers Ben Ali"
              maxLength={30}
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-surface px-4 py-4 text-center text-xl font-bold text-white placeholder-gray-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            {error && <p className="text-center text-sm text-red-400">{error}</p>}

            <button
              onClick={saveName}
              disabled={!teamName.trim() || saving}
              className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Enregistrement..." : "C'est notre nom ! ✅"}
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-gray-600">
            Vous pourrez changer de nom plus tard si vous le souhaitez.
          </p>
        </div>
      </main>
    );
  }

  // ─── Écran 3 : Les règles ────────────────────────────────────
  if (step === "rules") {
    const displayName = team.name;
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-deep px-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="text-5xl mb-3">📜</div>
            <h2 className="text-2xl font-black text-white mb-1">
              Prêts, {displayName} ?
            </h2>
            <p className="text-sm text-gray-400">Voici comment fonctionne le rallye</p>
          </div>

          <div className="space-y-3 mb-8">
            {[
              {
                emoji: "🧭",
                title: "Suivez la carte",
                desc: "Votre téléphone vous guide vers chaque animal grâce au GPS.",
              },
              {
                emoji: "❓",
                title: "Répondez aux questions",
                desc: "À chaque étape, une question sur l'animal vous attend. Un indice est disponible si besoin !",
              },
              {
                emoji: "📸",
                title: "Prenez votre selfie",
                desc: "Bonne réponse ? Immortalisez le moment avec une photo souvenir aux côtés de l'animal.",
              },
              {
                emoji: "🖨️",
                title: "Récupérez vos photos",
                desc: "À la fin du rallye, rendez-vous à l'accueil — vos 7 photos seront imprimées pour vous !",
              },
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3">
                <span className="text-2xl shrink-0 mt-0.5">{rule.emoji}</span>
                <div>
                  <p className="font-bold text-white text-sm">{rule.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep("go")}
            className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-white transition-all active:scale-95"
          >
            À l&apos;aventure ! 🌿
          </button>
        </div>
      </main>
    );
  }

  // ─── Écran 4 : Go ! ──────────────────────────────────────────
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-deep px-6 text-center">
      <div
        className="text-8xl mb-6"
        style={{ animation: "spin-in 0.6s ease-out" }}
      >
        🌿
      </div>
      <h2 className="text-3xl font-black text-primary mb-2">C&apos;est parti !</h2>
      <p className="text-gray-400 mb-8">Bonne chance, {team.name} !</p>
      <button
        onClick={() => router.push("/rally")}
        className="w-full max-w-sm rounded-xl bg-primary py-4 text-lg font-bold text-white transition-all active:scale-95 shadow-lg shadow-primary/30"
      >
        Ouvrir la carte 🗺️
      </button>

      <style>{`
        @keyframes spin-in {
          0%   { transform: rotate(-180deg) scale(0); opacity: 0; }
          100% { transform: rotate(0deg) scale(1); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
