import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { REGISTRATION_ROLE } from "@/lib/roles";
import { getQuotaStatus, getSetting, SETTING_KEYS } from "@/lib/settings";
import { handleApiError, logActivity, jsonError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
    username: z
      .string()
      .trim()
      .min(3, "Username minimal 3 karakter")
      .max(32)
      .regex(/^[a-z0-9_.]+$/i, "Username hanya boleh huruf, angka, titik, underscore"),
    password: z.string().min(8, "Password minimal 8 karakter").max(128),
    confirmPassword: z.string(),
    nisn: z
      .string()
      .trim()
      .regex(/^\d{10}$/, "NISN harus 10 digit angka")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    // CSRF sederhana: tolak cross-origin
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== new URL(request.url).host) {
          return jsonError("Permintaan tidak valid.", 403);
        }
      } catch {
        return jsonError("Permintaan tidak valid.", 403);
      }
    }

    // Rate limiting: 3 pendaftaran / menit per IP (anti spam akun)
    const ipLimit = rateLimit(`register:ip:${clientIp(request)}`, 3, 60_000);
    if (!ipLimit.allowed) {
      const res = jsonError("Terlalu banyak pendaftaran. Coba lagi nanti.", 429);
      res.headers.set("Retry-After", String(ipLimit.retryAfterSec));
      return res;
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return jsonError("Body JSON tidak valid.", 400);
    }

    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "_";
        if (!fields[key]) fields[key] = issue.message;
      }
      return jsonError("Data pendaftaran tidak valid.", 400, fields);
    }

    const { fullName, username, password, nisn } = parsed.data;
    const normalizedUsername = username.toLowerCase();

    // Registrasi bisa ditutup oleh developer via Settings
    const registrationOpen = (await getSetting(SETTING_KEYS.REGISTRATION_OPEN)) === "true";
    if (!registrationOpen) {
      return jsonError("Pendaftaran akun baru sedang ditutup.", 403);
    }

    // Kuota anggota — divalidasi di backend (bukan hanya frontend)
    const quota = await getQuotaStatus();
    if (quota.full) {
      return jsonError("Kuota anggota kelas saat ini sudah penuh.", 403);
    }

    // username unik
    const existing = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });
    if (existing) {
      return jsonError("Data pendaftaran tidak valid.", 400, {
        username: "Username sudah digunakan.",
      });
    }

    // Anti race-condition kuota: transaksi + count ulang di dalam transaksi.
    // SQLite menserialisasi tulisan, sehingga dua register bersamaan tidak
    // bisa sama-sama melewati batas kuota.
    const user = await prisma.$transaction(async (tx) => {
      const current = await tx.user.count({ where: { role: REGISTRATION_ROLE, isActive: true } });
      if (current >= quota.max) {
        throw new Error("QUOTA_FULL");
      }
      return tx.user.create({
        data: {
          username: normalizedUsername,
          // Role default murid — TIDAK bisa dipilih publik
          role: REGISTRATION_ROLE,
          passwordHash: await bcrypt.hash(password, 12),
          profile: {
            create: {
              fullName,
              nisn: nisn || null,
            },
          },
          // MAINTENANCE V0.2 — Automatic Class Membership: murid baru langsung
          // masuk daftar Anggota Kelas (satu sumber kebenaran = ClassMember).
          // Atomic dalam transaksi yang sama: gagal membership = rollback user
          // + profile, tidak ada kondisi "auth berhasil → membership gagal".
          // Proteksi duplikat: ClassMember.userId @unique di level database.
          member: {
            create: {
              fullName,
              nisn: nisn || null,
            },
          },
        },
        select: { id: true, username: true, role: true },
      });
    });

    await logActivity({
      userId: user.id,
      action: "REGISTRATION",
      description: `Akun murid baru terdaftar: ${user.username}`,
    });

    return NextResponse.json(
      { ok: true, user: { username: user.username, role: user.role } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "QUOTA_FULL") {
      return jsonError("Kuota anggota kelas saat ini sudah penuh.", 403);
    }
    return handleApiError(error, "register");
  }
}
