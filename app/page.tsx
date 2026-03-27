"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Compass } from "lucide-react";

function HomeContent() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  // Auto-redirect if URL has ?code= or ?team= params (from QR code scan)
  useEffect(() => {
    const urlCode = params.get("code");
    const urlTeam = params.get("team");
    if (urlTeam) {
      router.push(`/join?team=${encodeURIComponent(urlTeam)}${urlCode ? `&code=${encodeURIComponent(urlCode)}` : ""}`);
    } else if (urlCode) {
      router.push(`/join?code=${encodeURIComponent(urlCode)}`);
    }
  }, [params, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    router.push(`/join?code=${encodeURIComponent(code.trim().toUpperCase())}`);
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <div className="mb-12 flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20">
          <Compass className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">The Quest</h1>
        <p className="text-gray-400">Interactive treasure hunt</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Access Key"
          maxLength={10}
          className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-center text-xl font-mono tracking-widest text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          autoFocus
        />
        <button
          type="submit"
          disabled={!code.trim() || loading}
          className="w-full rounded-xl bg-primary py-3 text-lg font-semibold text-white transition-all hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Loading..." : "Enter"}
        </button>
      </form>

      <p className="mt-8 text-sm text-gray-600">
        Enter the Access Key or Team Code
      </p>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-[100dvh] items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
