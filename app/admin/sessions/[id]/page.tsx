"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Sparkles,
  QrCode,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  Check,
  Circle,
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
  narrative_name?: string | null;
  description: string;
  qr_code_id?: string;
  order: number;
  steps?: StepData[];
  step_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  physical_id?: string | null;
  expanded?: boolean;
  dirty?: boolean;
}

// Debounce helper
function useDebouncedCallback<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]) as T;
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
  const [regeneratingNarrative, setRegeneratingNarrative] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

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
              narrative_name: (o.narrative_name as string | null) ?? null,
              latitude: o.latitude as number | null ?? null,
              longitude: o.longitude as number | null ?? null,
              physical_id: o.physical_id as string | null ?? null,
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

  // ── Auto-save logic ──
  const autoSaveRef = useRef<(objId: string, stepId: string | undefined, objUpdates: Record<string, unknown>, stepUpdates?: Record<string, unknown>) => void>();

  const doAutoSave = useCallback(async (objId: string, stepId: string | undefined, objUpdates: Record<string, unknown>, stepUpdates?: Record<string, unknown>) => {
    if (!objId) return;
    setSaveStatus("saving");
    try {
      await fetch("/api/objects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objId,
          ...objUpdates,
          ...(stepId && stepUpdates ? { step_id: stepId, step: stepUpdates } : {}),
        }),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }, []);

  const debouncedAutoSave = useDebouncedCallback(
    ((...args: unknown[]) => doAutoSave(args[0] as string, args[1] as string | undefined, args[2] as Record<string, unknown>, args[3] as Record<string, unknown> | undefined)) as (...args: unknown[]) => void,
    1000
  );

  autoSaveRef.current = debouncedAutoSave;

  function updateObject(idx: number, field: string, value: string) {
    setObjects((prev) => {
      const next = prev.map((o, i) => (i === idx ? { ...o, [field]: value, dirty: false } : o));
      const obj = next[idx];
      if (obj.id) {
        autoSaveRef.current?.(obj.id, obj.step_id, { [field]: value });
      }
      return next;
    });
  }

  function updateStep(idx: number, field: string, value: string) {
    setObjects((prev) => {
      const next = prev.map((o, i) => {
        if (i !== idx) return o;
        const steps = [...(o.steps ?? [])];
        if (steps.length === 0) steps.push({ text_narratif: "", enigme: "", answer: "", type: "enigme", photo_indice_url: "" });
        steps[0] = { ...steps[0], [field]: value };
        return { ...o, steps, dirty: false };
      });
      const obj = next[idx];
      const step = obj.steps?.[0];
      if (obj.id && obj.step_id && step) {
        autoSaveRef.current?.(obj.id, obj.step_id, {}, {
          text_narratif: step.text_narratif,
          enigme: step.enigme || null,
          answer: step.answer || null,
          type: step.type,
          photo_indice_url: step.photo_indice_url || null,
        });
      }
      return next;
    });
  }

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

  async function regenerateNarrativeName(idx: number) {
    const obj = objects[idx];
    if (!obj.id || !session) return;
    setRegeneratingNarrative(obj.id);
    try {
      const res = await fetch("/api/scenario/narrative-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_name: obj.name,
          theme: session.theme ?? "A mysterious adventure",
          session_name: session.name,
        }),
      });
      const json: ApiResponse = await res.json();
      const data = json.data as { narrative_name: string } | null;
      if (data?.narrative_name) {
        await fetch("/api/objects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: obj.id, narrative_name: data.narrative_name }),
        });
        setObjects((prev) =>
          prev.map((o, i) => i === idx ? { ...o, narrative_name: data.narrative_name } : o)
        );
      }
    } catch { /* silent */ }
    setRegeneratingNarrative(null);
  }

  async function generateScenario() {
    if (!session) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          session_name: session.name,
          theme: session.theme ?? "A mysterious adventure",
        }),
      });
      const json: ApiResponse = await res.json();
      if (json.error) {
        alert(`Generation error: ${json.error}`);
      } else {
        // Refetch from database — the API already persisted everything
        await loadData();
      }
    } catch {
      alert("Generation failed — network error");
    }
    setGenerating(false);
  }

  async function generateQRPdf() {
    setGeneratingQR(true);
    try {
      const { jsPDF } = await import("jspdf");
      const QRCode = (await import("qrcode")).default;

      const doc = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const pageH = 297;
      const margin = 20;
      const cols = 2;
      const rows = 2;
      const qrSize = 70;
      const cellW = (pageW - margin * 2) / cols;
      const headerH = 30;
      const cellH = (pageH - margin * 2 - headerH) / rows;

      const savedObjects = objects.filter((o) => o.id && o.physical_id);
      const totalPages = Math.ceil(savedObjects.length / 4);

      for (let i = 0; i < savedObjects.length; i++) {
        const pageIdx = Math.floor(i / 4);
        const posOnPage = i % 4;
        const col = posOnPage % cols;
        const row = Math.floor(posOnPage / cols);

        if (i > 0 && posOnPage === 0) doc.addPage();

        if (posOnPage === 0) {
          doc.setFontSize(18);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(127, 119, 221);
          doc.text("THE QUEST", pageW / 2, margin + 5, { align: "center" });

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(session?.name ?? "Quest Session", pageW / 2, margin + 12, { align: "center" });

          doc.setDrawColor(127, 119, 221);
          doc.setLineWidth(0.5);
          doc.line(margin, margin + 16, pageW - margin, margin + 16);

          doc.setFontSize(7);
          doc.setTextColor(180, 180, 180);
          doc.text(`Page ${pageIdx + 1} / ${totalPages}`, pageW / 2, pageH - 10, { align: "center" });
          doc.text("Print and place each QR code next to its corresponding object", pageW / 2, pageH - 6, { align: "center" });
        }

        const obj = savedObjects[i];
        const cellX = margin + col * cellW;
        const cellY = margin + headerH + row * cellH;

        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(cellX + 4, cellY + 2, cellW - 8, cellH - 8, 3, 3, "S");

        const badgeX = cellX + 10;
        const badgeY = cellY + 8;
        doc.setFillColor(127, 119, 221);
        doc.circle(badgeX, badgeY, 4, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(String(i + 1), badgeX, badgeY + 1, { align: "center" });

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        const nameX = cellX + cellW / 2;
        doc.text(obj.name, nameX, cellY + 12, { align: "center" });

        const qrContent = obj.physical_id ?? obj.qr_code_id ?? obj.name;
        const qrDataUrl = await QRCode.toDataURL(qrContent, {
          width: 400, margin: 1, color: { dark: "#1a1a2e", light: "#ffffff" },
        });
        const qrX = cellX + (cellW - qrSize) / 2;
        const qrY = cellY + 18;
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(160, 160, 160);
        doc.text(qrContent, nameX, qrY + qrSize + 4, { align: "center" });

        if (obj.description) {
          doc.setFontSize(7);
          doc.setTextColor(130, 130, 130);
          const desc = obj.description.length > 60 ? obj.description.slice(0, 57) + "..." : obj.description;
          doc.text(desc, nameX, qrY + qrSize + 9, { align: "center" });
        }
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

  async function regenerateCode() {
    if (!session) return;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const l = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * 26)]).join("");
    const d = String(Math.floor(Math.random() * 100)).padStart(2, "0");
    const newCode = `${l}${d}`;

    try {
      const res = await fetch("/api/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: session.id, code: newCode }),
      });
      const json: ApiResponse = await res.json();
      if (json.data) setSession(json.data as Session);
    } catch { /* silent */ }
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
            <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
              <span>Code: <span className="font-mono font-bold">{session?.code}</span></span>
              <button
                onClick={regenerateCode}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                title="Generate a new code for the next group"
              >
                Regenerate
              </button>
              <span> · {objects.length} objects</span>
              {/* Save status indicator */}
              <span className="ml-auto flex items-center gap-1 text-xs">
                {saveStatus === "saving" ? (
                  <><Circle className="h-2 w-2 animate-pulse text-amber-500" /> Saving...</>
                ) : saveStatus === "saved" ? (
                  <><Check className="h-3 w-3 text-green-500" /> Saved</>
                ) : null}
              </span>
            </div>
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
            {generating ? "Generating 9 stages..." : "Generate with AI"}
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

        {/* Intro section */}
        {session && (session.intro_text || session.intro_enigme) && (
          <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-indigo-700">Introduction (Step 0)</h3>
            {session.intro_text && (
              <p className="mb-2 text-sm italic text-gray-600">{session.intro_text}</p>
            )}
            {session.intro_enigme && (
              <div className="mt-2 rounded-lg bg-white p-3">
                <p className="text-xs font-medium text-gray-500">First Riddle</p>
                <p className="text-sm text-gray-800">{session.intro_enigme}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-400">Answer:</span>
                  <span className="rounded bg-green-50 px-2 py-0.5 font-mono text-sm font-bold text-green-700">{session.intro_answer ?? "—"}</span>
                </div>
              </div>
            )}
          </div>
        )}

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
            const isNew = !obj.id;

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

                  <div className="flex flex-1 flex-col min-w-0">
                    <input
                      type="text"
                      value={obj.name}
                      onChange={(e) => updateObject(idx, "name", e.target.value)}
                      placeholder="Object name..."
                      className="bg-transparent text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none"
                    />
                    {obj.narrative_name && (
                      <span className="truncate text-xs text-gray-400">{obj.narrative_name}</span>
                    )}
                  </div>

                  {obj.id && (
                    <button
                      onClick={() => regenerateNarrativeName(idx)}
                      disabled={regeneratingNarrative === obj.id}
                      title="Regenerate narrative name"
                      className="shrink-0 text-gray-300 hover:text-indigo-500 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${regeneratingNarrative === obj.id ? "animate-spin" : ""}`} />
                    </button>
                  )}

                  {step && (
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      step.type === "epreuve" ? "bg-orange-50 text-orange-600"
                      : step.type === "navigation" ? "bg-blue-50 text-blue-600"
                      : "bg-green-50 text-green-600"
                    }`}>
                      {step.type}
                    </span>
                  )}

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

                      {/* Enigme + Answer */}
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

                      {/* GPS Position */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">GPS Position</label>
                        {obj.latitude ? (
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="font-mono text-xs text-gray-600">
                              {String(obj.latitude).slice(0, 10)}, {String(obj.longitude).slice(0, 11)}
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <span className="h-2 w-2 rounded-full bg-amber-400" /> Not placed yet
                          </span>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <button
                            onClick={async () => {
                              if (!obj.id) return;
                              if (!navigator.geolocation) { alert("GPS not available"); return; }
                              navigator.geolocation.getCurrentPosition(async (pos) => {
                                const lat = pos.coords.latitude;
                                const lng = pos.coords.longitude;
                                await fetch("/api/objects", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: obj.id, latitude: lat, longitude: lng }),
                                });
                                setObjects((prev) => prev.map((o) =>
                                  o.id === obj.id ? { ...o, latitude: lat, longitude: lng } : o
                                ));
                              }, () => alert("GPS permission denied"));
                            }}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            Use my position
                          </button>
                          <span className="text-xs text-gray-300">or</span>
                          <input
                            type="text"
                            placeholder="36.6865, 10.2092"
                            defaultValue={obj.latitude ? `${obj.latitude}, ${obj.longitude}` : ""}
                            className="w-56 rounded border border-gray-200 px-2 py-1 font-mono text-xs text-gray-700 focus:border-indigo-400 focus:outline-none"
                            onBlur={async (e) => {
                              if (!obj.id) return;
                              const parts = e.target.value.split(",").map((s) => parseFloat(s.trim()));
                              if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
                              const [lat, lng] = parts;
                              await fetch("/api/objects", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: obj.id, latitude: lat, longitude: lng }),
                              });
                              setObjects((prev) => prev.map((o) =>
                                o.id === obj.id ? { ...o, latitude: lat, longitude: lng } : o
                              ));
                            }}
                          />
                        </div>
                      </div>

                      {/* QR Code ID + Physical ID */}
                      {obj.qr_code_id && (
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">QR Code / Physical ID</label>
                          <p className="font-mono text-xs text-gray-400">{obj.qr_code_id} {obj.physical_id ? `(${obj.physical_id})` : ""}</p>
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
                        {isNew && (
                          <button
                            onClick={() => saveObject(idx)}
                            disabled={isSaving || !obj.name.trim()}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            {isSaving ? "Creating..." : "Create"}
                          </button>
                        )}
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
