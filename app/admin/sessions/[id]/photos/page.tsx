"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Download, Images, Loader2, CheckCircle2 } from "lucide-react";
import { Loader } from "@/components/shared";
import type { ApiResponse } from "@/lib/types";

interface PhotoEntry {
  id: string;
  storage_url: string;
  created_at: string;
  team_id: string;
  teams: { name: string };
  objects: { name: string; emoji: string; order: number } | null;
}

interface TeamGroup {
  team_id: string;
  team_name: string;
  photos: PhotoEntry[];
}

async function downloadPhoto(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

export default function PhotosPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingTeam, setDownloadingTeam] = useState<string | null>(null);
  const [downloadedTeams, setDownloadedTeams] = useState<Set<string>>(new Set());

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/photo?session_id=${sessionId}`);
      const json: ApiResponse = await res.json();
      const photos = (json.data ?? []) as PhotoEntry[];

      // Grouper par équipe
      const map = new Map<string, TeamGroup>();
      for (const p of photos) {
        if (!map.has(p.team_id)) {
          map.set(p.team_id, {
            team_id: p.team_id,
            team_name: p.teams?.name ?? "Équipe inconnue",
            photos: [],
          });
        }
        map.get(p.team_id)!.photos.push(p);
      }

      // Trier les photos de chaque équipe par order de l'objet
      const result = Array.from(map.values()).map((g) => ({
        ...g,
        photos: g.photos.sort((a, b) => (a.objects?.order ?? 99) - (b.objects?.order ?? 99)),
      }));

      // Trier les équipes par nom
      result.sort((a, b) => a.team_name.localeCompare(b.team_name));
      setGroups(result);
    } catch { /* silent */ }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  async function downloadTeamPhotos(group: TeamGroup) {
    setDownloadingTeam(group.team_id);
    const safeName = group.team_name.replace(/[^a-zA-Z0-9]/g, "_");
    for (let i = 0; i < group.photos.length; i++) {
      const p = group.photos[i];
      const animalName = (p.objects?.name ?? `photo_${i + 1}`).replace(/[^a-zA-Z0-9]/g, "_");
      await downloadPhoto(p.storage_url, `${safeName}_${i + 1}_${animalName}.jpg`);
      // Petite pause pour que le navigateur traite chaque téléchargement
      await new Promise((r) => setTimeout(r, 400));
    }
    setDownloadingTeam(null);
    setDownloadedTeams((prev) => new Set(prev).add(group.team_id));
  }

  const totalPhotos = groups.reduce((acc, g) => acc + g.photos.length, 0);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader text="Chargement des photos..." />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Images className="h-6 w-6 text-green-600" />
              Photos Souvenir
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {groups.length} équipe{groups.length > 1 ? "s" : ""} · {totalPhotos} photo{totalPhotos > 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={loadPhotos}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Actualiser
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
            <Images className="mx-auto mb-3 h-12 w-12 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Aucune photo pour l'instant</p>
            <p className="mt-1 text-xs text-gray-400">Les photos apparaîtront ici au fur et à mesure que les équipes progressent.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.team_id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {/* Team header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">{group.team_name}</h2>
                    <p className="text-xs text-gray-400">{group.photos.length} photo{group.photos.length > 1 ? "s" : ""}</p>
                  </div>
                  <button
                    onClick={() => downloadTeamPhotos(group)}
                    disabled={downloadingTeam === group.team_id}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                      downloadedTeams.has(group.team_id)
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-900 text-white hover:bg-gray-700"
                    } disabled:opacity-50`}
                  >
                    {downloadingTeam === group.team_id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Téléchargement...
                      </>
                    ) : downloadedTeams.has(group.team_id) ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Téléchargé
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Tout télécharger ({group.photos.length})
                      </>
                    )}
                  </button>
                </div>

                {/* Photo grid */}
                <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-5">
                  {group.photos.map((photo, i) => (
                    <div key={photo.id} className="group relative overflow-hidden rounded-lg bg-gray-100 aspect-[3/4]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.storage_url}
                        alt={photo.objects?.name ?? `Photo ${i + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {/* Overlay au survol */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all">
                        <button
                          onClick={() => {
                            const safeName = group.team_name.replace(/[^a-zA-Z0-9]/g, "_");
                            const animalName = (photo.objects?.name ?? `photo_${i + 1}`).replace(/[^a-zA-Z0-9]/g, "_");
                            downloadPhoto(photo.storage_url, `${safeName}_${i + 1}_${animalName}.jpg`);
                          }}
                          className="opacity-0 group-hover:opacity-100 rounded-full bg-white p-2.5 shadow-lg transition-opacity"
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4 text-gray-900" />
                        </button>
                      </div>
                      {/* Badge animal */}
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-sm">
                        <span className="text-xs">{photo.objects?.emoji ?? "📷"}</span>
                        <span className="text-[10px] font-medium text-white leading-none">
                          {photo.objects?.name ?? "Photo"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
