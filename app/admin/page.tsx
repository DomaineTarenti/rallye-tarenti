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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/session?all=true");
        const json: ApiResponse = await res.json();
        if (json.data) setSessions(json.data as SessionWithCount[]);
      } catch { /* silent */ }
      setLoading(false);
    }
    load();
  }, []);

  const activeSessions = sessions.filter((s) => s.status === "active");
  const totalTeams = sessions.reduce((sum, s) => sum + (s.team_count ?? 0), 0);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader text="Loading dashboard..." />
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

                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
