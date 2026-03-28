"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronLeft, Sparkles, Copy, AlertTriangle } from "lucide-react";
import { Button, Card, Input } from "@/components/shared";
import { usePlayerStore } from "@/lib/store";
import type { ApiResponse, TeamCharacter } from "@/lib/types";

const ANIMALS = [
  { id: "lion", name: "Lion", emoji: "\u{1F981}", code: "LIO" },
  { id: "eagle", name: "Eagle", emoji: "\u{1F985}", code: "EAG" },
  { id: "wolf", name: "Wolf", emoji: "\u{1F43A}", code: "WOL" },
  { id: "fox", name: "Fox", emoji: "\u{1F98A}", code: "FOX" },
  { id: "bear", name: "Bear", emoji: "\u{1F43B}", code: "BEA" },
  { id: "panther", name: "Panther", emoji: "\u{1F406}", code: "PAN" },
  { id: "serpent", name: "Serpent", emoji: "\u{1F40D}", code: "SER" },
  { id: "scorpion", name: "Scorpion", emoji: "\u{1F982}", code: "SCO" },
];

const ASTRAL_HUES = [
  { name: "Crimson", hex: "#EF4444" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Sapphire", hex: "#3B82F6" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Rose", hex: "#EC4899" },
  { name: "Silver", hex: "#94A3B8" },
];

function generateTeamCode(animalCode: string): string {
  const digits = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `${animalCode}${digits}`;
}

export default function CharacterPage() {
  const router = useRouter();
  const session = usePlayerStore((s) => s.session);
  const existingTeam = usePlayerStore((s) => s.team);
  const setTeam = usePlayerStore((s) => s.setTeam);
  const setTeamCharacter = usePlayerStore((s) => s.setTeamCharacter);
  const setSteps = usePlayerStore((s) => s.setSteps);
  const setObjects = usePlayerStore((s) => s.setObjects);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setCurrentStep = usePlayerStore((s) => s.setCurrentStep);
  const setStartTime = usePlayerStore((s) => s.setStartTime);

  // If team already exists (pre-created), pre-fill the name
  const isPrecreated = !!existingTeam?.is_precreated;

  const [teamName, setTeamName] = useState(existingTeam?.name ?? "");
  const [selectedAnimal, setSelectedAnimal] = useState<(typeof ANIMALS)[number] | null>(null);
  const [selectedColor, setSelectedColor] = useState<(typeof ASTRAL_HUES)[number] | null>(null);
  const [warCry, setWarCry] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [teamCode, setTeamCode] = useState("");
  const [codeNoted, setCodeNoted] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const sessionId = session?.id;

  if (!session) {
    router.push("/");
    return null;
  }

  const canSubmit = teamName.trim().length >= 2 && selectedAnimal && selectedColor;

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhotoPreview(URL.createObjectURL(file));
  }

  function copyCode() {
    navigator.clipboard.writeText(teamCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  async function handleSubmit() {
    if (!canSubmit || !selectedAnimal || !selectedColor) return;
    setLoading(true);
    setError(null);

    const code = isPrecreated
      ? (existingTeam?.access_code ?? generateTeamCode(selectedAnimal.code))
      : generateTeamCode(selectedAnimal.code);

    const character: TeamCharacter = {
      animal: selectedAnimal.id,
      animalEmoji: selectedAnimal.emoji,
      color: selectedColor.hex,
      warCry,
      teamCode: code,
    };

    try {
      if (isPrecreated && existingTeam) {
        // Update existing pre-created team
        const res = await fetch("/api/team/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_code: existingTeam.access_code,
            name: teamName.trim(),
            character: JSON.stringify(character),
          }),
        });

        const json: ApiResponse = await res.json();
        if (!res.ok || json.error || !json.data) {
          setError(json.error ?? "Failed to update team");
          setLoading(false);
          return;
        }

        const data = json.data as Record<string, unknown>;
        setTeam(data.team as never);
        setTeamCharacter(character);
        setObjects(data.objects as never[]);
        setSteps(data.steps as never[]);
        setProgress(data.progress as never[]);

        const stepsArr = data.steps as Array<Record<string, unknown>>;
        if (stepsArr.length > 0) setCurrentStep(stepsArr[0] as never);
      } else {
        // Create new team (normal flow)
        const res = await fetch("/api/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            name: teamName.trim(),
            character: JSON.stringify(character),
          }),
        });

        const json: ApiResponse = await res.json();
        if (!res.ok || json.error || !json.data) {
          setError(json.error ?? "Failed to create fellowship");
          setLoading(false);
          return;
        }

        const data = json.data as Record<string, unknown>;
        setTeam(data.team as never);
        setTeamCharacter(character);
        setObjects(data.objects as never[]);
        setSteps(data.steps as never[]);
        setProgress(data.progress as never[]);

        const stepsArr = data.steps as Array<Record<string, unknown>>;
        if (stepsArr.length > 0) setCurrentStep(stepsArr[0] as never);
      }

      setTeamCode(code);
      setStartTime(Date.now());
      setConfirmed(true);
      setLoading(false);
    } catch {
      setError("Connection error. Please check your network.");
      setLoading(false);
    }
  }

  // ── Confirmation screen with recovery code ──
  if (confirmed) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-6">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
          <Check className="h-8 w-8 text-green-400" />
        </div>

        <h1 className="mb-1 text-2xl font-bold">Fellowship Forged!</h1>
        <p className="mb-6 text-gray-400">Your legacy begins now</p>

        {/* Badge */}
        <Card className="mb-4 w-full max-w-xs bg-surface text-center">
          <div
            className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl"
            style={{ backgroundColor: selectedColor?.hex + "25" }}
          >
            {selectedAnimal?.emoji}
          </div>
          <p className="text-xl font-bold" style={{ color: selectedColor?.hex }}>
            {teamName}
          </p>
          {warCry && (
            <p className="mt-2 text-sm italic text-gray-500">&ldquo;{warCry}&rdquo;</p>
          )}
        </Card>

        {/* Recovery code — BIG + prominent */}
        <div
          className="mb-4 w-full max-w-xs rounded-2xl border-4 p-6 text-center"
          style={{ borderColor: selectedColor?.hex, backgroundColor: selectedColor?.hex + "10" }}
        >
          <p className="mb-2 text-xs uppercase tracking-wider text-gray-400">Your Fellowship Code</p>
          <p
            className="font-mono text-5xl font-black tracking-[0.2em]"
            style={{ color: selectedColor?.hex }}
          >
            {teamCode}
          </p>
          <button
            onClick={copyCode}
            className="mt-3 flex items-center justify-center gap-1.5 mx-auto rounded-lg px-4 py-2 text-sm font-medium transition"
            style={{ backgroundColor: selectedColor?.hex + "20", color: selectedColor?.hex }}
          >
            {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {codeCopied ? "Copied!" : "Copy code"}
          </button>
        </div>

        {/* Warning */}
        <div className="mb-6 w-full max-w-xs rounded-xl bg-amber/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
            <div className="text-xs text-amber/90">
              <p className="font-bold">Note this code — it is your key!</p>
              <p className="mt-1 text-amber/70">
                If you switch phones or close the app, enter this code on the-quest.vercel.app to resume your journey.
              </p>
            </div>
          </div>
        </div>

        {/* Checkbox */}
        <label className="mb-6 flex w-full max-w-xs cursor-pointer items-center gap-3 rounded-xl bg-surface p-3">
          <input
            type="checkbox"
            checked={codeNoted}
            onChange={(e) => setCodeNoted(e.target.checked)}
            className="h-5 w-5 rounded accent-primary"
          />
          <span className="text-sm text-gray-300">I have noted my code</span>
        </label>

        <Button
          onClick={() => router.push("/navigate")}
          size="lg"
          className="w-full max-w-xs"
          disabled={!codeNoted}
        >
          <Sparkles className="mr-2 inline h-5 w-5" />
          Begin the Quest
        </Button>
      </main>
    );
  }

  // ── Creation form ──
  return (
    <main className="flex min-h-[100dvh] flex-col px-6 pb-6 pt-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="mb-1 text-2xl font-bold">Forge Your Legacy</h1>
      <p className="mb-8 text-sm text-gray-400">Choose wisely, these marks are eternal</p>

      <Card className="mb-8 bg-surface text-center">
        <div
          className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-all"
          style={{ backgroundColor: selectedColor ? selectedColor.hex + "25" : "rgba(255,255,255,0.05)" }}
        >
          {selectedAnimal ? selectedAnimal.emoji : "?"}
        </div>
        <p className="font-bold transition-all" style={{ color: selectedColor?.hex ?? "#6B7280" }}>
          {teamName || "Fellowship Name"}
        </p>
        {warCry && <p className="mt-1 text-xs italic text-gray-500">&ldquo;{warCry}&rdquo;</p>}
      </Card>

      <div className="mb-6">
        <Input label="Fellowship Name *" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="The Unbroken Circle" maxLength={30} className="bg-surface" />
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-400">Animal Totem *</label>
        <div className="grid grid-cols-4 gap-3">
          {ANIMALS.map((a) => (
            <button key={a.id} onClick={() => setSelectedAnimal(a)} className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${selectedAnimal?.id === a.id ? "border-primary bg-primary/10 scale-105" : "border-white/10 bg-surface hover:border-white/20"}`}>
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-[10px] text-gray-400">{a.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-400">Astral Hue *</label>
        <div className="flex justify-center gap-3">
          {ASTRAL_HUES.map((c) => (
            <button key={c.hex} onClick={() => setSelectedColor(c)} className={`h-10 w-10 rounded-full border-2 transition-all ${selectedColor?.hex === c.hex ? "scale-125 border-white shadow-lg" : "border-transparent hover:scale-110"}`} style={{ backgroundColor: c.hex }} title={c.name} />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <Input label="Echo of Valour (optional)" value={warCry} onChange={(e) => setWarCry(e.target.value)} placeholder="Through fire we rise!" maxLength={50} className="bg-surface" />
      </div>

      <div className="mb-8">
        <label className="mb-2 block text-sm font-medium text-gray-400">Fellowship Portrait (optional)</label>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 bg-surface p-4 transition hover:border-white/20">
          {photoPreview ? (
            <img src={photoPreview} alt="Portrait" className="h-32 w-full rounded-lg object-cover" />
          ) : (
            <><Camera className="h-8 w-8 text-gray-500" /><span className="text-sm text-gray-500">Capture your fellowship</span></>
          )}
          <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
        </label>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      <Button onClick={handleSubmit} size="lg" className="w-full" disabled={!canSubmit || loading}>
        {loading ? "Forging..." : "Seal the Pact"}
      </Button>
    </main>
  );
}
