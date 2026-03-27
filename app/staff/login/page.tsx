"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useStaffStore } from "@/lib/staffStore";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const prefilledSession = params.get("session") ?? "";

  const setStaff = useStaffStore((s) => s.setStaff);
  const existingStaffId = useStaffStore((s) => s.staffId);

  const [sessionCode, setSessionCode] = useState(prefilledSession);
  const [staffName, setStaffName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect
  useEffect(() => {
    if (existingStaffId) router.replace("/staff/dashboard");
  }, [existingStaffId, router]);

  async function handleLogin() {
    if (!sessionCode.trim() || !staffName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Find active session by code
      const { data: session } = await supabase
        .from("sessions")
        .select("id, name, code, status")
        .eq("code", sessionCode.trim().toUpperCase())
        .single();

      if (!session) {
        setError("Session not found. Check the code.");
        setLoading(false);
        return;
      }

      if (session.status !== "active") {
        setError("This session is not active.");
        setLoading(false);
        return;
      }

      // 2. Find staff member by name in this session (partial match)
      const { data: staffMembers } = await supabase
        .from("staff_members")
        .select("*")
        .eq("session_id", session.id)
        .ilike("name", `%${staffName.trim()}%`);

      const member = staffMembers?.[0];

      if (!member) {
        // Show available names to help
        const { data: allStaff } = await supabase
          .from("staff_members")
          .select("name")
          .eq("session_id", session.id);
        const names = (allStaff ?? []).map((s) => s.name).join(", ");
        setError(`Not found. Available: ${names || "none"}`);
        setLoading(false);
        return;
      }

      // 3. Generate validation code if missing
      let code = member.validation_code;
      if (!code) {
        code = String(Math.floor(1000 + Math.random() * 9000));
        await supabase
          .from("staff_members")
          .update({ validation_code: code })
          .eq("id", member.id);
      }

      // 4. Store in Zustand
      setStaff({
        staffId: member.id,
        staffName: member.name,
        sessionId: session.id,
        sessionCode: session.code,
        sessionName: session.name,
        assignedStepId: member.assigned_step_id,
        validationCode: code,
      });

      router.push("/staff/dashboard");
    } catch {
      setError("Connection error. Check your network.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-deep px-6">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-white">Guardian Space</h1>
        <p className="text-sm text-gray-400">The Quest — Staff</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-400">Session Code</label>
          <input
            type="text"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
            placeholder="TARENTI24"
            maxLength={10}
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 font-mono text-center text-lg tracking-widest text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-400">Your Name</label>
          <input
            type="text"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="Le Premier Gardien"
            className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={!sessionCode.trim() || !staffName.trim() || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
          {loading ? "Connecting..." : "Access"}
        </button>
      </div>
    </main>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-[100dvh] items-center justify-center bg-deep">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
