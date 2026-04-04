"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { usePlayerStore } from "@/lib/store";
import type { ApiResponse, Photo } from "@/lib/types";

export default function FinishPage() {
  const router = useRouter();
  const team = usePlayerStore((s) => s.team);
  const session = usePlayerStore((s) => s.session);
  const objects = usePlayerStore((s) => s.objects);
  const photos = usePlayerStore((s) => s.photos);
  const setPhotos = usePlayerStore((s) => s.setPhotos);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!team) return;
    if (photos.length === 0) {
      fetch(`/api/photo?team_id=${team.id}`)
        .then((r) => r.json())
        .then((json: ApiResponse<Photo[]>) => {
          if (json.data) setPhotos(json.data);
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id]);

  useEffect(() => {
    if (!team) router.push("/");
  }, [team, router]);

  if (!team) return null;

  function formatTime(seconds: number | null) {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}min ${s.toString().padStart(2, "0")}s`;
  }

  const duration = formatTime((team as unknown as Record<string, number | null>).completion_time);

  return (
    <main className="flex min-h-[100dvh] flex-col bg-deep text-white">
      {/* Confettis animaux */}
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className="pointer-events-none fixed"
          style={{
            left: `${(i * 5.2 + 3) % 100}%`,
            top: -20,
            animation: `particle-fall ${2.5 + (i % 4) * 0.5}s linear ${(i * 0.3) % 3}s infinite`,
          }}
        >
          {["🌿", "🐐", "🐄", "🐷", "🐔", "🐇", "🫏"][i % 7]}
        </div>
      ))}

      <div className="relative z-10 flex flex-col items-center px-6 py-10">
        {/* Trophée */}
        <div className="text-8xl mb-4">🏆</div>
        <h1 className="text-2xl font-black text-white text-center mb-1">
          Bravo {team.name} !
        </h1>
        <p className="text-gray-400 text-sm mb-2">
          {session?.name ?? "Rallye Tarenti"}
        </p>

        {/* Temps */}
        {duration && (
          <div className="mb-6 rounded-xl bg-surface/60 px-5 py-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Temps</p>
            <p className="text-2xl font-bold text-primary">{duration}</p>
          </div>
        )}

        {/* Message accueil */}
        <div className="w-full max-w-sm rounded-2xl border border-primary/30 bg-primary/10 px-6 py-5 text-center mb-8">
          <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
          <p className="text-base font-bold text-white mb-1">
            Rendez-vous à l&apos;accueil !
          </p>
          <p className="text-sm text-gray-300">
            Vos <strong>{photos.length} photo{photos.length > 1 ? "s" : ""}</strong> souvenir vous attendent,
            prêtes à être imprimées.
          </p>
        </div>

        {/* Galerie photos */}
        {loaded && photos.length > 0 && (
          <div className="w-full max-w-sm mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Vos photos du rallye
            </p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => {
                const obj = objects.find((o) => o.id === photo.object_id);
                return (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.storage_url}
                      alt={obj?.name ?? "Photo"}
                      className="h-full w-full object-cover"
                    />
                    {obj && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-1 text-center">
                        <span className="text-xs">{obj.emoji}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Récap animaux rencontrés */}
        <div className="w-full max-w-sm mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Les animaux rencontrés
          </p>
          <div className="grid grid-cols-4 gap-2">
            {objects
              .filter((o) => !o.is_final)
              .sort((a, b) => a.order - b.order)
              .map((obj) => (
                <div key={obj.id} className="flex flex-col items-center gap-1 rounded-xl bg-surface p-2">
                  <span className="text-2xl">{obj.emoji}</span>
                  <span className="text-[10px] text-gray-500 text-center leading-tight">
                    {obj.name.replace(/^(Les?|L'|Le) /i, "")}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <p className="text-xs text-gray-600 text-center">
          Merci d&apos;avoir participé au Rallye Tarenti !
        </p>
      </div>
    </main>
  );
}
