"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function handleOffline() { setOffline(true); }
    function handleOnline() { setOffline(false); }

    setOffline(!navigator.onLine);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber/90 px-4 py-2 text-xs font-medium text-deep">
      <WifiOff className="h-3.5 w-3.5" />
      Offline mode — some features may be unavailable
    </div>
  );
}
