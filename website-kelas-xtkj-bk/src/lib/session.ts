import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isRole, type Role } from "@/lib/roles";

// ================================
// Session cookie bertanda tangan (HMAC-SHA256)
// Format: <userId>.<expiresAtMs>.<tokenVersion>.<hmac>
// tokenVersion di database memungkinkan invalidasi semua sesi lama
// (logout semua perangkat, reset password, role change) tanpa state server.
// Secret wajib dari env — jangan hard-code.
// ================================

const COOKIE_NAME = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET belum diset atau terlalu pendek (min 32 karakter)."
    );
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

interface TokenData {
  userId: number;
  version: number;
}

function createToken(userId: number, version: number): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expiresAt}.${version}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): TokenData | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userIdStr, expiresStr, versionStr, mac] = parts;
  const payload = `${userIdStr}.${expiresStr}.${versionStr}`;
  const expected = sign(payload);
  // Perbandingan constant-time
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  const userId = Number(userIdStr);
  const version = Number(versionStr);
  if (!Number.isInteger(userId) || !Number.isInteger(version) || userId <= 0 || version < 0) {
    return null;
  }
  return { userId, version };
}

// ================================
// Operasi session
// ================================

export async function createSession(userId: number): Promise<void> {
  // Ambil tokenVersion terkini agar sesi lama otomatis tidak sah
  // setelah reset password/role change (yang menaikkan version).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  const version = user?.tokenVersion ?? 0;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createToken(userId, version), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export interface SessionUser {
  id: number;
  username: string;
  role: Role;
  fullName: string;
  photo: string | null;
}

/** Ambil user dari session cookie. null jika tidak login / session invalid. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenData = verifyToken(token);
  if (tokenData === null) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        tokenVersion: true,
        profile: { select: { fullName: true, photo: true } },
      },
    });
    if (!user || !user.isActive) return null;
    // tokenVersion berbeda → sesi lama (mis. setelah logout semua perangkat,
    // reset password, atau perubahan role) → invalid
    if (tokenData.version !== user.tokenVersion) return null;
    if (!isRole(user.role)) return null;
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.profile?.fullName ?? user.username,
      photo: user.profile?.photo ?? null,
    };
  } catch {
    // Database error → perlakukan sebagai tidak login (tanpa bocorkan detail)
    return null;
  }
}
