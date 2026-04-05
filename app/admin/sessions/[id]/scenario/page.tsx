"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Check, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { Loader } from "@/components/shared";
import type { ApiResponse } from "@/lib/types";

interface StepScenario {
  id: string;
  intro_text: string;
  question: string;
  answer: string;
  hint: string;
  fun_fact: string;
}

interface AnimalRow {
  id: string;
  name: string;
  emoji?: string;
  order: number;
  step_id: string;
  step: StepScenario;
  expanded: boolean;
}

function useDebouncedCallback<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]) as T;
}

const EMOJI_MAP: Record<string, string> = {
  "Tortue": "🐢", "Poule": "🐔", "Âne": "🫏", "Cheval": "🐴",
  "Vache": "🐄", "Chèvre": "🐐", "Lapin": "🐇", "Canard": "🦆",
  "Chat": "🐱", "Chien": "🐕", "Mouton": "🐑", "Cochon": "🐷",
};

export default function ScenarioPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/objects?session_id=${sessionId}`);
      const json: ApiResponse = await res.json();
      if (json.data) {
        const raw = json.data as Array<Record<string, unknown>>;
        const rows: AnimalRow[] = raw
          .filter((o) => {
            const steps = (o.steps as Array<Record<string, unknown>>) ?? [];
            return steps.length > 0;
          })
          .map((o) => {
            const steps = (o.steps as Array<Record<string, unknown>>) ?? [];
            const s = steps[0];
            return {
              id: o.id as string,
              name: o.name as string,
              emoji: EMOJI_MAP[o.name as string] ?? "🐾",
              order: o.order as number,
              step_id: s.id as string,
              step: {
                id: s.id as string,
                intro_text: (s.intro_text as string) ?? "",
                question: (s.question as string) ?? "",
                answer: (s.answer as string) ?? "",
                hint: (s.hint as string) ?? "",
                fun_fact: (s.fun_fact as string) ?? "",
              },
              expanded: false,
            };
          });
        setAnimals(rows);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  const doSave = useCallback(async (objId: string, stepId: string, step: Partial<StepScenario>) => {
    setSaveStatus("saving");
    try {
      await fetch("/api/objects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: objId, step_id: stepId, step }),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }, []);

  const debouncedSave = useDebouncedCallback(
    ((...args: unknown[]) => doSave(args[0] as string, args[1] as string, args[2] as Partial<StepScenario>)) as (...args: unknown[]) => void,
    800
  );

  function updateField(animalIdx: number, field: keyof StepScenario, value: string) {
    setAnimals((prev) => {
      const next = prev.map((a, i) => {
        if (i !== animalIdx) return a;
        return { ...a, step: { ...a.step, [field]: value } };
      });
      const animal = next[animalIdx];
      debouncedSave(animal.id, animal.step_id, { [field]: value || null });
      return next;
    });
  }

  function toggleExpand(idx: number) {
    setAnimals((prev) => prev.map((a, i) => i === idx ? { ...a, expanded: !a.expanded } : a));
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader text="Chargement du scénario..." />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scénario</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Questions, réponses, indices et anecdotes — sauvegarde automatique
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            {saveStatus === "saving" ? (
              <><Circle className="h-2 w-2 animate-pulse text-amber-500" /> Sauvegarde...</>
            ) : saveStatus === "saved" ? (
              <><Check className="h-3.5 w-3.5 text-green-500" /> Sauvegardé</>
            ) : null}
          </span>
        </div>

        {animals.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm text-gray-400">Aucun animal configuré. Ajoutez des objets dans Configure.</p>
          </div>
        )}

        <div className="space-y-3">
          {animals.map((animal, idx) => (
            <div key={animal.id} className="rounded-xl border border-gray-200 bg-white">
              {/* Header row */}
              <button
                onClick={() => toggleExpand(idx)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-lg">
                  {animal.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{animal.name}</p>
                  {animal.step.question ? (
                    <p className="truncate text-xs text-gray-400">{animal.step.question}</p>
                  ) : (
                    <p className="text-xs text-amber-500">Question non renseignée</p>
                  )}
                </div>
                {/* Completion dots */}
                <div className="flex gap-1 shrink-0">
                  {(["intro_text", "question", "answer", "hint", "fun_fact"] as const).map((f) => (
                    <span
                      key={f}
                      title={f}
                      className={`h-1.5 w-1.5 rounded-full ${animal.step[f] ? "bg-green-400" : "bg-gray-200"}`}
                    />
                  ))}
                </div>
                {animal.expanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                )}
              </button>

              {/* Expanded fields */}
              {animal.expanded && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {/* Intro text */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Texte d&apos;introduction
                    </label>
                    <textarea
                      value={animal.step.intro_text}
                      onChange={(e) => updateField(idx, "intro_text", e.target.value)}
                      rows={3}
                      placeholder="Texte affiché avant la question, pour plonger les joueurs dans l'ambiance..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Question */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Question / Énigme
                    </label>
                    <textarea
                      value={animal.step.question}
                      onChange={(e) => updateField(idx, "question", e.target.value)}
                      rows={3}
                      placeholder="La question posée à l'équipe..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Answer */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Réponse attendue
                    </label>
                    <input
                      type="text"
                      value={animal.step.answer}
                      onChange={(e) => updateField(idx, "answer", e.target.value)}
                      placeholder="mot-clé ou phrase courte (insensible à la casse)"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none font-mono"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      La réponse est normalisée (minuscules, sans accents) — entrez-la telle qu&apos;elle apparaît sur le panneau.
                    </p>
                  </div>

                  {/* Hint */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Indice
                    </label>
                    <textarea
                      value={animal.step.hint}
                      onChange={(e) => updateField(idx, "hint", e.target.value)}
                      rows={2}
                      placeholder="Indice progressif si l'équipe est bloquée..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none resize-none"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Premier clic = 50% de l&apos;indice · Deuxième clic = indice complet
                    </p>
                  </div>

                  {/* Fun fact */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Le saviez-vous ? (anecdote)
                    </label>
                    <textarea
                      value={animal.step.fun_fact}
                      onChange={(e) => updateField(idx, "fun_fact", e.target.value)}
                      rows={3}
                      placeholder="Anecdote affichée après une bonne réponse..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
