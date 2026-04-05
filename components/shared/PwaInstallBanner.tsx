"use client";

import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

const DISMISSED_KEY = "pwa-install-dismissed";

export default function PwaInstallBanner() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Ne pas afficher si déjà installée ou déjà ignorée
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const p = detectPlatform();
    setPlatform(p);

    // Capturer l'événement beforeinstallprompt (Android/Chrome)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function installAndroid() {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    setInstalling(false);
    setDeferredPrompt(null);
  }

  // Masquer si : déjà en standalone, ignorée, ou plateforme inconnue sans prompt Android
  if (!platform || dismissed) return null;
  if (platform === "other" && !deferredPrompt) return null;
  if (platform === "android" && !deferredPrompt) return null;

  return (
    <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-white">
            Installer l&apos;app sur votre téléphone
          </p>
        </div>
        <button onClick={dismiss} className="text-gray-500 hover:text-gray-300 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      {platform === "ios" && (
        <>
          <p className="text-xs text-gray-400 leading-relaxed mb-3">
            Pour ne pas perdre votre progression, ajoutez l&apos;app à votre écran d&apos;accueil :
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px] shrink-0">1</span>
              <span>Appuyez sur le bouton <Share className="inline h-3.5 w-3.5 text-blue-400" /> en bas de Safari</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px] shrink-0">2</span>
              <span>Choisissez <strong className="text-white">« Sur l&apos;écran d&apos;accueil »</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px] shrink-0">3</span>
              <span>Appuyez sur <strong className="text-white">« Ajouter »</strong> en haut à droite</span>
            </div>
          </div>
        </>
      )}

      {platform === "android" && deferredPrompt && (
        <>
          <p className="text-xs text-gray-400 mb-3">
            Accédez au rallye en un tap, même sans réseau.
          </p>
          <button
            onClick={installAndroid}
            disabled={installing}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
          >
            {installing ? "Installation..." : "📲 Installer l'app"}
          </button>
        </>
      )}
    </div>
  );
}
