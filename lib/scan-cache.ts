// In-memory scan result cache to prevent double-scans
// TTL: 30 seconds

interface CacheEntry {
  result: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const TTL_MS = 30_000;

// Clean up every 60s
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    cache.forEach((entry, key) => {
      if (now > entry.expiresAt) cache.delete(key);
    });
  }, 60_000);
}

export function getCachedScan(qrCodeId: string, teamId: string): unknown | null {
  const key = `${qrCodeId}:${teamId}`;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function setCachedScan(qrCodeId: string, teamId: string, result: unknown): void {
  const key = `${qrCodeId}:${teamId}`;
  cache.set(key, { result, expiresAt: Date.now() + TTL_MS });
}
