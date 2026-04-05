/**
 * Rate limiter en mémoire — adapté pour Vercel serverless (par instance).
 * Suffisant pour protéger contre le brute-force et le spam accidentel.
 */
interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Nettoyage périodique pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}, 60_000);

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number; // secondes
}

/**
 * @param key        Identifiant unique (ex: IP, team_id, etc.)
 * @param max        Nombre max de requêtes dans la fenêtre
 * @param windowMs   Durée de la fenêtre en millisecondes
 */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= max) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { ok: true };
}
