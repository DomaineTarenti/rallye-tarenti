"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Sparkles, Upload } from "lucide-react";
import type { ApiResponse, Session } from "@/lib/types";

function generateCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const l = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * 26)]).join("");
  const d = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `${l}${d}`;
}

// We need an org_id. For now, use the seeded one or create a default.
const DEFAULT_ORG_ID = "a1b2c3d4-0001-4000-8000-000000000001";

const DURATION_MARKS = [30, 45, 60, 75, 90, 120, 150, 180];

export default function NewSessionPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [code, setCode] = useState(generateCode());
  const [duration, setDuration] = useState(60);
  const [theme, setTheme] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7F77DD");
  const [secretWord, setSecretWord] = useState("LABYRINTH");
  const [secretWordError, setSecretWordError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[]>(["FR"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length >= 2 && code.trim().length >= 3 && !secretWordError;

  function toggleLang(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: DEFAULT_ORG_ID,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          status: "draft",
          theme: theme.trim() || null,
          duration_minutes: duration,
          primary_color: primaryColor,
          secret_word: secretWord.toUpperCase().trim(),
          logo_url: null, // TODO: upload to Supabase Storage
        }),
      });

      const json: ApiResponse<Session> = await res.json();

      if (!res.ok || json.error || !json.data) {
        setError(json.error ?? "Failed to create session");
        setLoading(false);
        return;
      }

      router.push(`/admin/sessions/${json.data.id}`);
    } catch {
      setError("Connection error");
      setLoading(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Back */}
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <h1 className="mb-1 text-2xl font-bold text-gray-900">Create a Session</h1>
        <p className="mb-8 text-sm text-gray-500">
          Set up a new treasure hunt experience
        </p>

        <div className="space-y-6">
          {/* Session name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Session Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tarenti Mysteria"
              maxLength={60}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Access code */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Access Key *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-mono text-lg tracking-widest text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                onClick={() => setCode(generateCode())}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Generate
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Players will enter this code to join
            </p>
          </div>

          {/* Duration slider */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Estimated Duration: <span className="font-bold text-indigo-600">{duration} min</span>
            </label>
            <input
              type="range"
              min={30}
              max={180}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              {DURATION_MARKS.map((m) => (
                <span key={m}>{m}m</span>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Narrative Theme
            </label>
            <textarea
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="A Mediterranean mystery set in ancient ruins..."
              rows={3}
              maxLength={300}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Secret word */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Secret Word
            </label>
            <input
              type="text"
              value={secretWord}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                setSecretWord(val);
                if (val.length !== 9) {
                  setSecretWordError("Must be exactly 9 letters");
                } else if (new Set(val).size !== 9) {
                  setSecretWordError("All 9 letters must be unique");
                } else {
                  setSecretWordError(null);
                }
              }}
              maxLength={9}
              placeholder="LABYRINTH"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-mono text-lg tracking-[0.3em] text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {secretWordError ? (
              <p className="mt-1 text-xs text-red-500">{secretWordError}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">
                This word will be revealed letter by letter as players complete each stage
              </p>
            )}
          </div>

          {/* Logo upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Logo (white-label)
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white p-4 transition hover:border-gray-400">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-12 w-12 rounded-lg object-contain" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {logoPreview ? "Change logo" : "Upload logo"}
                </p>
                <p className="text-xs text-gray-400">PNG, SVG or JPG</p>
              </div>
              <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
            </label>
          </div>

          {/* Primary color */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
              />
              <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: primaryColor }} />
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Languages
            </label>
            <div className="flex gap-2">
              {["FR", "EN", "AR"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => toggleLang(lang)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    languages.includes(lang)
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? "Creating..." : "Create & Configure Path"}
          </button>
        </div>
      </div>
    </div>
  );
}
