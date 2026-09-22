import { NextRequest, NextResponse } from "next/server";

// Middleware edge: hanya verifikasi tanda tangan cookie session (Web Crypto API).
// Verifikasi role & data user tetap dilakukan di server component/API.

const COOKIE_NAME = "session";

async function verifySignature(token: string, secret: string): Promise<boolean> {
  // Format token: <userId>.<expiresAtMs>.<tokenVersion>.<hmac>
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [userIdStr, expiresStr, versionStr, mac] = parts;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${userIdStr}.${expiresStr}.${versionStr}`)
  );
  // Konversi signature ke base64url untuk perbandingan
  const sigBytes = new Uint8Array(signature);
  let bin = "";
  for (const b of sigBytes) bin += String.fromCharCode(b);
  const expected = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // Perbandingan constant-time sederhana
  if (expected.length !== mac.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ mac.charCodeAt(i);
  }
  return diff === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hanya proteksi area /dashboard
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const secret = process.env.SESSION_SECRET;

    let valid = false;
    if (token && secret && secret.length >= 32) {
      try {
        if (await verifySignature(token, secret)) {
          const expiresAt = Number(token.split(".")[1]);
          valid = Number.isFinite(expiresAt) && Date.now() <= expiresAt;
        }
      } catch {
        valid = false;
      }
    }
    // Catatan: verifikasi tokenVersion di sini tidak mungkin (edge runtime
    // tidak punya akses DB) — itu dilakukan di getSessionUser() server-side,
    // jadi cookie lama tetap ditolak sebelum render konten.

    if (!valid) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
