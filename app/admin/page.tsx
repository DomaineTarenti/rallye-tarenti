"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  Users,
  Zap,
  Clock,
  ChevronRight,
  Play,
  Pause,
  CheckCircle2,
  FileEdit,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Loader } from "@/components/shared";
import type { ApiResponse, Session } from "@/lib/types";

interface SessionWithCount extends Session {
  team_count: number;
}

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: FileEdit, color: "text-gray-500", bg: "bg-gray-100" },
  active: { label: "Active", icon: Play, color: "text-green-600", bg: "bg-green-50" },
  paused: { label: "Paused", icon: Pause, color: "text-amber-600", bg: "bg-amber-50" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50" },
};

export default function AdminDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/session?all=true");
        const json: ApiResponse = await res.json();
        if (json.error) {
          setError(json.error);
        } else if (json.data) {
          setSessions(json.data as SessionWithCount[]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sessions");
      }
      setLoading(false);
    }
    load();
  }, []);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function executeDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    console.log("[DELETE] Starting delete for:", deleteTarget.id, deleteTarget.name);
    try {
      const res = await fetch(`/api/session?id=${deleteTarget.id}`, { method: "DELETE" });
      console.log("[DELETE] Response status:", res.status);
      const json: ApiResponse = await res.json();
      console.log("[DELETE] Response body:", json);
      if (!res.ok || json.error) {
        setDeleteError(json.error ?? `Server returned ${res.status}`);
        setDeleting(false);
        return;
      }
      // Success — refetch list
      setDeleteTarget(null);
      const reload = await fetch("/api/session?all=true");
      const reloadJson: ApiResponse = await reload.json();
      if (reloadJson.data) setSessions(reloadJson.data as SessionWithCount[]);
    } catch (e) {
      console.error("[DELETE] Error:", e);
      setDeleteError(e instanceof Error ? e.message : "Network error");
    }
    setDeleting(false);
  }

  const activeSessions = sessions.filter((s) => s.status === "active");
  const totalTeams = sessions.reduce((sum, s) => sum + (s.team_count ?? 0), 0);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader text="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-red-600">Error: {error}</p>
        <p className="text-xs text-gray-400">
          Make sure you ran <code className="rounded bg-gray-100 px-1.5 py-0.5">supabase/admin-policies.sql</code> in the Supabase SQL Editor.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <LayoutDashboard className="h-6 w-6 text-indigo-600" />
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your treasure hunt sessions
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/sessions/new")}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Session
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <Zap className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeSessions.length}</p>
                <p className="text-xs text-gray-500">Active sessions</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalTeams}</p>
                <p className="text-xs text-gray-500">Total teams</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
                <p className="text-xs text-gray-500">Total sessions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions list */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700">All Sessions</h2>
          </div>

          {sessions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-gray-400">No sessions yet.</p>
              <button
                onClick={() => router.push("/admin/sessions/new")}
                className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Create your first session
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map((session) => {
                const cfg = STATUS_CONFIG[session.status];
                const StatusIcon = cfg.icon;
                return (
                  <button
                    key={session.id}
                    onClick={() => router.push(`/admin/sessions/${session.id}`)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-gray-50"
                  >
                    {/* Status badge */}
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cfg.bg}`}>
                      <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{session.name}</p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                        <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                        <span>Code: {session.code}</span>
                        <span>{session.duration_minutes} min</span>
                        <span>{session.team_count} teams</span>
                      </div>
                    </div>

                    {/* Quick actions for active sessions */}
                    {session.status === "active" && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/sessions/${session.id}/live`);
                        }}
                        className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                      >
                        Live
                      </span>
                    )}

                    {session.status !== "active" && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: session.id, name: session.name });
                          setDeleteError(null);
                        }}
                        title="Delete session"
                        className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </span>
                    )}

                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete session?</h3>
                <p className="text-sm text-gray-500">{deleteTarget.name}</p>
              </div>
            </div>

            <p className="mb-4 text-sm text-gray-500">
              This is irreversible. All teams, progress, and data for this session will be permanently deleted.
            </p>

            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
