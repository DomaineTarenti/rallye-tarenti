"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Users, QrCode, Loader2, RefreshCw, Download } from "lucide-react";
import { Loader } from "@/components/shared";
import type { ApiResponse, Session } from "@/lib/types";

interface TeamData {
  id: string;
  name: string;
  access_code: string | null;
  status: string;
  is_precreated: boolean;
  character: string | null;
  object_order: string[];
}

const COLORS = [
  "#7F77DD", "#1D9E75", "#D85A30", "#EF9F27",
  "#378ADD", "#D4537E", "#639922", "#534AB7",
  "#0F6E56", "#993C1D",
];

export default function AdminTeamsPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sessRes, teamsRes] = await Promise.all([
        fetch(`/api/session?all=true`),
        fetch(`/api/teams?session_id=${sessionId}`),
      ]);
      const sessJson: ApiResponse = await sessRes.json();
      const teamsJson: ApiResponse = await teamsRes.json();

      if (sessJson.data) {
        const all = sessJson.data as Session[];
        const found = all.find((s) => s.id === sessionId);
        if (found) setSession(found);
      }
      if (teamsJson.data) {
        setTeams(teamsJson.data as TeamData[]);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function generateTeamCardsPdf() {
    if (!session) return;
    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const QRCode = (await import("qrcode")).default;

      const doc = new jsPDF("l", "mm", "a4"); // landscape
      const pageW = 297;
      const pageH = 210;
      const cols = 2;
      const rows = 2;
      const cardW = (pageW - 30) / cols;
      const cardH = (pageH - 30) / rows;
      const precreated = teams.filter((t) => t.access_code);

      for (let i = 0; i < precreated.length; i++) {
        const team = precreated[i];
        const pageIdx = Math.floor(i / 4);
        const pos = i % 4;
        const col = pos % cols;
        const row = Math.floor(pos / cols);

        if (i > 0 && pos === 0) doc.addPage();

        const x = 15 + col * cardW;
        const y = 15 + row * cardH;
        const color = COLORS[i % COLORS.length];

        // Card border
        doc.setDrawColor(parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16));
        doc.setLineWidth(1.5);
        doc.roundedRect(x, y, cardW - 10, cardH - 10, 5, 5, "S");

        // Session name
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        doc.text(session.name, x + (cardW - 10) / 2, y + 10, { align: "center" });

        // Team name
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(team.name, x + (cardW - 10) / 2, y + 20, { align: "center" });

        // QR code
        const url = `https://the-quest.vercel.app?code=${session.code}&team=${team.access_code}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 300, margin: 1, color: { dark: "#1a1a2e", light: "#ffffff" },
        });
        const qrSize = 45;
        doc.addImage(qrDataUrl, "PNG", x + (cardW - 10 - qrSize) / 2, y + 25, qrSize, qrSize);

        // Access code
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16));
        doc.text(team.access_code ?? "", x + (cardW - 10) / 2, y + 78, { align: "center" });

        // Footer
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text("Scannez pour jouer", x + (cardW - 10) / 2, y + 85, { align: "center" });
      }

      doc.save(`${session.name}-team-cards.pdf`);
    } catch (err) {
      console.error("PDF error:", err);
    }
    setGeneratingPdf(false);
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader text="Loading teams..." /></div>;
  }

  const precreated = teams.filter((t) => t.is_precreated);
  const adhoc = teams.filter((t) => !t.is_precreated);

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
            <p className="text-sm text-gray-500">
              {precreated.length} pre-created · {adhoc.length} ad-hoc
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateTeamCardsPdf}
              disabled={generatingPdf || precreated.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Team Cards PDF
            </button>
          </div>
        </div>

        {/* Pre-created teams */}
        {precreated.length > 0 && (
          <>
            <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Pre-created Teams</h2>
            <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {precreated.map((team, idx) => {
                const color = COLORS[idx % COLORS.length];
                const statusColor = team.status === "playing" ? "bg-green-100 text-green-700"
                  : team.status === "finished" ? "bg-gray-100 text-gray-500"
                  : "bg-amber-50 text-amber-700";

                return (
                  <div key={team.id} className="rounded-xl border bg-white p-4" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{team.name}</span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor}`}>
                        {team.status}
                      </span>
                    </div>
                    {team.access_code && (
                      <p className="mb-1 font-mono text-2xl font-black tracking-wider" style={{ color }}>
                        {team.access_code}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {team.object_order?.length ?? 0} steps · Order randomized
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Ad-hoc teams */}
        {adhoc.length > 0 && (
          <>
            <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">Ad-hoc Teams</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {adhoc.map((team) => {
                const statusColor = team.status === "playing" ? "bg-green-100 text-green-700"
                  : team.status === "finished" ? "bg-gray-100 text-gray-500"
                  : "bg-amber-50 text-amber-700";

                return (
                  <div key={team.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{team.name}</span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor}`}>
                        {team.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {teams.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">No teams yet. Teams are created when the session is set up with a team count, or when players join.</p>
          </div>
        )}
      </div>
    </div>
  );
}
