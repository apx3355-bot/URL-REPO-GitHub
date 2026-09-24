// Rate limiter in-memory (fixed window) — Phase 6 security hardening.
// Sesuai stack project: tanpa Redis/dependency baru. Cocok untuk single-instance
// (dev & deploy satu server). Jika nanti deploy multi-instance, ganti dengan
// penyimpanan bersama (Redis/Upstash) — interface sengaja dibuat generik.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bersihkan bucket kadaluarsa secara berkala agar memori tidak tumbuh
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Detik sampai window reset (untuk header Retry-After). */
  retryAfterSec: number;
  remaining: number;
}

/**
 * Cek & catat satu request.
 * @param key   identitas unik, mis. `login:ip:1.2.3.4` atau `login:user:budi`
 * @param limit maksimum request per window
 * @param windowMs ukuran window dalam milidetik
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0, remaining: limit - 1 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      remaining: 0,
    };
  }
  return { allowed: true, retryAfterSec: 0, remaining: limit - bucket.count };
}

/** Ambil IP klien dari request (behind proxy pun mencoba header standar). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Ekstrak username dari body tanpa menggagalkan request (best-effort). */
export async function peekUsername(request: Request): Promise<string> {
  try {
    const body = await request.clone().json();
    if (body && typeof body === "object" && typeof (body as { username?: unknown }).username === "string") {
      return (body as { username: string }).username.toLowerCase();
    }
  } catch {
    // body bukan JSON — abaikan
  }
  return "";
}
