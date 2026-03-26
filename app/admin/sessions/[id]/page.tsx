"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Sparkles,
  QrCode,
  Save,
  Loader2,
  Play,
  Pause,
} from "lucide-react";
import { Loader } from "@/components/shared";
import type { ApiResponse, Session } from "@/lib/types";

interface StepData {
  id?: string;
  text_narratif: string;
  enigme: string;
  answer: string;
  type: "enigme" | "epreuve" | "navigation";
  photo_indice_url: string;
}

interface ObjectData {
  id?: string;
  name: string;
  description: string;
  qr_code_id?: string;
  order: number;
  steps?: StepData[];
  step_id?: string;
  // UI state
  expanded?: boolean;
  dirty?: boolean;
}

export default function ConfigureSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sessRes, objRes] = await Promise.all([
        fetch(`/api/session?code=__id_${sessionId}`)
          .then(() => fetch(`/api/session?all=true`)),
        fetch(`/api/objects?session_id=${sessionId}`),
      ]);

      const sessJson: ApiResponse = await sessRes.json();
      const objJson: ApiResponse = await objRes.json();

      if (sessJson.data) {
        const all = sessJson.data as Session[];
        const found = all.find((s) => s.id === sessionId);
        if (found) setSession(found);
      }

      if (objJson.data) {
        const raw = objJson.data as Array<Record<string, unknown>>;
        setObjects(
          raw.map((o) => {
            const steps = (o.steps as StepData[]) ?? [];
            const step = steps[0];
            return {
              id: o.id as string,
              name: o.name as string,
              description: (o.description as string) ?? "",
              qr_code_id: o.qr_code_id as string,
              order: o.order as number,
              steps,
              step_id: step?.id,
              expanded: false,
              dirty: false,
            };
          })
        );
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  function addObject() {
    setObjects((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        order: prev.length + 1,
        steps: [{
          text_narratif: "",
          enigme: "",
          answer: "",
          type: "enigme",
          photo_indice_url: "",
        }],
        expanded: true,
        dirty: true,
      },
    ]);
  }

  function updateObject(idx: number, field: string, value: string) {
    setObjects((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, [field]: value, dirty: true } : o))
    );
  }

  function updateStep(idx: number, field: string, value: string) {
    setObjects((prev) =>
      prev.map((o, i) => {
        if (i !== idx) return o;
        const steps = [...(o.steps ?? [])];
        if (steps.length === 0) steps.push({ text_narratif: "", enigme: "", answer: "", type: "enigme", photo_indice_url: "" });
        steps[0] = { ...steps[0], [field]: value };
        return { ...o, steps, dirty: true };
      })
    );
  }

  function toggleExpand(idx: number) {
    setObjects((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, expanded: !o.expanded } : o))
    );
  }

  function moveObject(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= objects.length) return;
    setObjects((prev) => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((o, i) => ({ ...o, order: i + 1, dirty: true }));
    });
  }

  async function saveObject(idx: number) {
    const obj = objects[idx];
    const step = obj.steps?.[0];
    setSaving(obj.id ?? `new-${idx}`);

    try {
      if (obj.id) {
        // Update existing
        await fetch("/api/objects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: obj.id,
            name: obj.name,
            description: obj.description,
            order: obj.order,
            step_id: obj.step_id,
            step: step ? {
              text_narratif: step.text_narratif,
              enigme: step.enigme || null,
              answer: step.answer || null,
              type: step.type,
              photo_indice_url: step.photo_indice_url || null,
            } : undefined,
          }),
        });
      } else {
        // Create new
        const res = await fetch("/api/objects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            name: obj.name,
            order: obj.order,
            description: obj.description,
            step: step ? {
              text_narratif: step.text_narratif,
              enigme: step.enigme || null,
              answer: step.answer || null,
              type: step.type,
              photo_indice_url: step.photo_indice_url || null,
            } : undefined,
          }),
        });
        const json: ApiResponse = await res.json();
        if (json.data) {
          const d = json.data as Record<string, unknown>;
          setObjects((prev) =>
            prev.map((o, i) =>
              i === idx
                ? { ...o, id: d.id as string, qr_code_id: d.qr_code_id as string, step_id: ((d.steps as Array<Record<string, unknown>>)?.[0]?.id as string), dirty: false }
                : o
            )
          );
          setSaving(null);
          return;
        }
      }
      setObjects((prev) =>
        prev.map((o, i) => (i === idx ? { ...o, dirty: false } : o))
      );
    } catch { /* silent */ }
    setSaving(null);
  }

  async function deleteObject(idx: number) {
    const obj = objects[idx];
    if (obj.id) {
      await fetch(`/api/objects?id=${obj.id}`, { method: "DELETE" });
    }
    setObjects((prev) => prev.filter((_, i) => i !== idx).map((o, i) => ({ ...o, order: i + 1 })));
  }

  async function generateScenario() {
    if (!session) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_name: session.name,
          theme: session.theme ?? "A mysterious adventure",
          num_steps: 5,
          context: "",
        }),
      });
      const json: ApiResponse = await res.json();
      const data = json.data as { stages: Array<Record<string, string>> } | null;

      if (data?.stages) {
        const newObjects: ObjectData[] = data.stages.map((s, i) => ({
          name: s.object_name ?? `Object ${i + 1}`,
          description: s.object_description ?? "",
          order: i + 1,
          steps: [{
            text_narratif: s.text_narratif ?? "",
            enigme: s.enigme ?? "",
            answer: s.answer ?? "",
            type: (s.type as "enigme" | "epreuve" | "navigation") ?? "enigme",
            photo_indice_url: "",
          }],
          expanded: false,
          dirty: true,
        }));
        setObjects(newObjects);
      }
    } catch { /* silent */ }
    setGenerating(false);
  }

  async function generateQRPdf() {
    setGeneratingQR(true);
    try {
      const { jsPDF } = await import("jspdf");
      const QRCode = (await import("qrcode")).default;

      const doc = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const margin = 15;
      const qrSize = 80;
      const cols = 2;
      const gap = 10;

      const savedObjects = objects.filter((o) => o.id && o.qr_code_id);

      for (let i = 0; i < savedObjects.length; i++) {
        const obj = savedObjects[i];
        const col = i % cols;
        const row = Math.floor((i % 4) / cols);

        if (i > 0 && i % 4 === 0) doc.addPage();

        const x = margin + col * (qrSize + gap);
        const y = margin + row * (qrSize + gap + 15);

        // Generate QR as data URL
        const qrDataUrl = await QRCode.toDataURL(obj.qr_code_id!, {
          width: 300,
          margin: 1,
        });

        doc.addImage(qrDataUrl, "PNG", x, y, qrSize, qrSize);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(obj.name, x + qrSize / 2, y + qrSize + 5, {
          align: "center",
        });
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(obj.qr_code_id!, x + qrSize / 2, y + qrSize + 9, {
          align: "center",
        });
      }

      doc.save(`${session?.name ?? "quest"}-qr-codes.pdf`);
    } catch (err) {
      console.error("QR PDF generation error:", err);
    }
    setGeneratingQR(false);
  }

  async function toggleSessionStatus() {
    if (!session) return;
    setStatusUpdating(true);
    const newStatus = session.status === "active" ? "paused" : "active";
    try {
      const res = await fetch("/api/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: session.id,
          status: newStatus,
          ...(newStatus === "active" && !session.started_at ? { started_at: new Date().toISOString() } : {}),
        }),
      });
      const json: ApiResponse = await res.json();
      if (json.data) setSession(json.data as Session);
    } catch { /* silent */ }
    setStatusUpdating(false);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader text="Loading session..." />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {session?.name ?? "Session"}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Code: <span className="font-mono font-bold">{session?.code}</span>
              {" · "}{objects.length} objects
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleSessionStatus}
              disabled={statusUpdating}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                session?.status === "active"
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              {session?.status === "active" ? (
                <><Pause className="h-3.5 w-3.5" /> Pause</>
              ) : (
                <><Play className="h-3.5 w-3.5" /> Activate</>
              )}
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={generateScenario}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating..." : "Generate with AI"}
          </button>
          <button
            onClick={generateQRPdf}
            disabled={generatingQR || objects.filter((o) => o.id).length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {generatingQR ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            Generate QR PDF
          </button>
          <button
            onClick={addObject}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" /> Add Object
          </button>
        </div>

        {/* Objects list */}
        <div className="space-y-3">
          {objects.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <p className="text-sm text-gray-400">No objects yet. Add one or generate with AI.</p>
            </div>
          )}

          {objects.map((obj, idx) => {
            const step = obj.steps?.[0];
            const isSaving = saving === (obj.id ?? `new-${idx}`);

            return (
              <div
                key={obj.id ?? `new-${idx}`}
                className={`rounded-xl border bg-white transition ${
                  obj.dirty ? "border-indigo-200" : "border-gray-200"
                }`}
              >
                {/* Object header */}
                <div className="flex items-center gap-2 px-4 py-3">
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" />

                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                    {idx + 1}
                  </span>

                  <input
                    type="text"
                    value={obj.name}
                    onChange={(e) => updateObject(idx, "name", e.target.value)}
                    placeholder="Object name..."
                    className="flex-1 bg-transparent text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none"
                  />

                  {step && (
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      step.type === "epreuve" ? "bg-orange-50 text-orange-600"
                      : step.type === "navigation" ? "bg-blue-50 text-blue-600"
                      : "bg-green-50 text-green-600"
                    }`}>
                      {step.type}
                    </span>
                  )}

                  {/* Reorder */}
                  <button onClick={() => moveObject(idx, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-30">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => moveObject(idx, 1)} disabled={idx === objects.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-30">
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  <button onClick={() => toggleExpand(idx)} className="text-gray-400 hover:text-gray-600">
                    {obj.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {/* Expanded form */}
                {obj.expanded && (
                  <div className="border-t border-gray-100 p-4">
                    <div className="space-y-4">
                      {/* Step type */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Step Type</label>
                        <div className="flex gap-2">
                          {(["enigme", "epreuve", "navigation"] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => updateStep(idx, "type", t)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                                step?.type === t
                                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Narrative */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Narrative Text</label>
                        <textarea
                          value={step?.text_narratif ?? ""}
                          onChange={(e) => updateStep(idx, "text_narratif", e.target.value)}
                          rows={4}
                          placeholder="The immersive story text..."
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
                        />
                      </div>

                      {/* Enigme + Answer (only for enigme type) */}
                      {step?.type !== "navigation" && (
                        <>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
                              {step?.type === "epreuve" ? "Challenge Description" : "Riddle"}
                            </label>
                            <textarea
                              value={step?.enigme ?? ""}
                              onChange={(e) => updateStep(idx, "enigme", e.target.value)}
                              rows={2}
                              placeholder={step?.type === "epreuve" ? "Describe the physical challenge..." : "The riddle to solve..."}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
                            />
                          </div>

                          {step?.type === "enigme" && (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">Answer</label>
                              <input
                                type="text"
                                value={step?.answer ?? ""}
                                onChange={(e) => updateStep(idx, "answer", e.target.value)}
                                placeholder="The correct answer (lowercase)"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* QR Code ID (read-only) */}
                      {obj.qr_code_id && (
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">QR Code ID</label>
                          <p className="font-mono text-xs text-gray-400">{obj.qr_code_id}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                        <button
                          onClick={() => deleteObject(idx)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                        <button
                          onClick={() => saveObject(idx)}
                          disabled={isSaving || !obj.name.trim()}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          {isSaving ? "Saving..." : obj.id ? "Save" : "Create"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
