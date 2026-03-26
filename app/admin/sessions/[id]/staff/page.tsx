"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { Loader } from "@/components/shared";
import { supabase } from "@/lib/supabase";
import type { StaffMember, Step } from "@/lib/types";

function generateStaffCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function StaffPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [staff, setStaff] = useState<(StaffMember & { validation_code?: string })[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New staff form
  const [newName, setNewName] = useState("");
  const [newStep, setNewStep] = useState("");

  const loadData = useCallback(async () => {
    try {
      const supa = supabase;

      const [staffRes, objRes] = await Promise.all([
        supa.from("staff_members").select("*").eq("session_id", sessionId),
        supa.from("objects").select("id").eq("session_id", sessionId),
      ]);

      setStaff((staffRes.data ?? []) as never[]);

      if (objRes.data && objRes.data.length > 0) {
        const { data: stepsData } = await supa
          .from("steps")
          .select("*")
          .in("object_id", objRes.data.map((o) => o.id))
          .order("order");
        setSteps((stepsData ?? []) as Step[]);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function addStaff() {
    if (!newName.trim()) return;
    setAdding(true);

    const { error } = await supabase.from("staff_members").insert({
      session_id: sessionId,
      name: newName.trim(),
      role: "gardien",
      assigned_step_id: newStep || null,
    });

    if (!error) {
      setNewName("");
      setNewStep("");
      await loadData();
    }
    setAdding(false);
  }

  async function removeStaff(id: string) {
    await supabase.from("staff_members").delete().eq("id", id);
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }

  function copyCode(id: string, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader text="Loading staff..." />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ShieldCheck className="h-6 w-6 text-indigo-600" />
          Staff Management
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Manage guardians and their assigned challenges
        </p>

        {/* Add staff form */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Add a Guardian</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Guardian name"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
            />
            <select
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
            >
              <option value="">Assign to step (optional)</option>
              {steps.map((s, i) => (
                <option key={s.id} value={s.id}>
                  Step {i + 1}{s.type === "epreuve" ? " (challenge)" : ""}
                </option>
              ))}
            </select>
            <button
              onClick={addStaff}
              disabled={!newName.trim() || adding}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>
        </div>

        {/* Staff list */}
        <div className="space-y-3">
          {staff.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-400">No staff members yet.</p>
            </div>
          ) : (
            staff.map((member) => {
              const code = generateStaffCode(); // In production, store this
              const assignedStep = steps.find((s) => s.id === member.assigned_step_id);
              const stepIdx = assignedStep ? steps.indexOf(assignedStep) + 1 : null;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  </div>

                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      <span className="rounded bg-orange-50 px-1.5 py-0.5 font-medium text-orange-600">
                        {member.role}
                      </span>
                      {stepIdx && (
                        <span>
                          Assigned to Step {stepIdx}
                          {assignedStep?.type === "epreuve" ? " (challenge)" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Validation code */}
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Code</p>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-lg font-bold text-indigo-600">{code}</span>
                      <button
                        onClick={() => copyCode(member.id, code)}
                        className="rounded p-1 text-gray-300 hover:text-indigo-600"
                      >
                        {copiedId === member.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => removeStaff(member.id)}
                    className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
