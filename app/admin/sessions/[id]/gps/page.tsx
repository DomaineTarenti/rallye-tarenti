"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { MapPin, Save, Check, Loader2 } from "lucide-react";
import { Loader } from "@/components/shared";
import type { ApiResponse } from "@/lib/types";

interface ObjectEntry {
  id: string;
  name: string;
  emoji: string;
  order: number;
  latitude: number;
  longitude: number;
}

export default function GpsEditorPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [objects, setObjects] = useState<ObjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, { lat: string; lng: string }>>({});

  const loadObjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/objects?session_id=${sessionId}`);
      const json: ApiResponse = await res.json();
      if (json.data) {
        const objs = (json.data as Array<ObjectEntry>)
          .sort((a, b) => a.order - b.order);
        setObjects(objs);
        const initial: Record<string, { lat: string; lng: string }> = {};
        objs.forEach((o) => {
          initial[o.id] = {
            lat: String(o.latitude ?? ""),
            lng: String(o.longitude ?? ""),
          };
        });
        setEdits(initial);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { loadObjects(); }, [loadObjects]);

  async function saveCoords(obj: ObjectEntry) {
    const edit = edits[obj.id];
    if (!edit) return;
    const lat = parseFloat(edit.lat);
    const lng = parseFloat(edit.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    setSaving(obj.id);
    try {
      const res = await fetch("/api/objects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: obj.id, latitude: lat, longitude: lng }),
      });
      if (res.ok) {
        setSaved((prev) => new Set(prev).add(obj.id));
        setTimeout(() => setSaved((prev) => { const n = new Set(prev); n.delete(obj.id); return n; }), 2000);
      }
    } catch { /* silent */ }
    setSaving(null);
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader text="Chargement..." /></div>;
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <MapPin className="h-6 w-6 text-green-600" />
            Coordonnées GPS
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Modifiez les coordonnées de chaque étape. Tip : sur Google Maps, clic droit → copier les coordonnées.
          </p>
        </div>

        <div className="space-y-3">
          {objects.map((obj) => {
            const edit = edits[obj.id] ?? { lat: "", lng: "" };
            const isDirty =
              edit.lat !== String(obj.latitude) || edit.lng !== String(obj.longitude);

            return (
              <div key={obj.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <span className="text-2xl w-8 text-center shrink-0">{obj.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-2">{obj.name}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={edit.lat}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [obj.id]: { ...prev[obj.id], lat: e.target.value } }))}
                      placeholder="Latitude"
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-mono text-gray-900 focus:border-green-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={edit.lng}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [obj.id]: { ...prev[obj.id], lng: e.target.value } }))}
                      placeholder="Longitude"
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-mono text-gray-900 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => saveCoords(obj)}
                  disabled={!isDirty || saving === obj.id}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    saved.has(obj.id)
                      ? "bg-green-50 text-green-700"
                      : isDirty
                      ? "bg-gray-900 text-white hover:bg-gray-700"
                      : "bg-gray-50 text-gray-300 cursor-default"
                  }`}
                >
                  {saving === obj.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : saved.has(obj.id) ? (
                    <><Check className="h-3.5 w-3.5" /> Sauvé</>
                  ) : (
                    <><Save className="h-3.5 w-3.5" /> Sauver</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-gray-400 text-center">
          Les modifications sont effectives immédiatement pour tous les joueurs.
        </p>
      </div>
    </div>
  );
}
