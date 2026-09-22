import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { isRole } from "@/lib/roles";
import { handleApiError, logActivity, jsonError } from "@/lib/api";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi").max(64),
  password: z.string().min(1, "Password wajib diisi").max(128),
  // Pilihan role di form hanya bagian dari request; role asli tetap diverifikasi dari database.
  expectedRole: z.enum(["DEVELOPER", "WALI_KELAS", "ANGGOTA"]).optional(),
});

// CSRF sederhana: request cross-origin ditolak
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser client (curl, dsb.)
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) {
      return jsonError("Permintaan tidak valid.", 403);
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return jsonError("Body JSON tidak valid.", 400);
    }

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError("Username dan password wajib diisi.", 400);
    }
    const { username, password, expectedRole } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true, passwordHash: true, role: true, isActive: true },
    });

    // Pesan error identik untuk username/password salah — cegah user enumeration
    const invalidMsg = "Email atau password salah.";
    if (!user || !user.isActive) {
      // Tetap jalankan compare untuk timing yang konsisten
      await bcrypt.compare(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
      return jsonError(invalidMsg, 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await logActivity({
        userId: user.id,
        action: "LOGIN_FAILED",
        description: `Percobaan login gagal untuk ${user.username}`,
      });
      return jsonError(invalidMsg, 401);
    }

    if (!isRole(user.role)) {
      return jsonError("Role akun tidak valid. Hubungi developer.", 500);
    }

    // Verifikasi role: pilihan frontend tidak pernah menentukan role asli.
    // Jika user memilih role yang tidak cocok dengan database → tolak.
    if (expectedRole && expectedRole !== user.role) {
      await logActivity({
        userId: user.id,
        action: "LOGIN_ROLE_MISMATCH",
        description: `${user.username} mencoba login sebagai ${expectedRole} tetapi akunnya ${user.role}`,
      });
      const roleLabel =
        expectedRole === "DEVELOPER"
          ? "Developer"
          : expectedRole === "WALI_KELAS"
            ? "Wali Kelas"
            : "Murid";
      return jsonError(`Akun ini tidak memiliki akses sebagai ${roleLabel}.`, 403);
    }

    await createSession(user.id);
    await logActivity({
      userId: user.id,
      action: "LOGIN",
      description: `${user.username} berhasil login`,
    });

    return NextResponse.json({
      ok: true,
      user: { username: user.username, role: user.role },
    });
  } catch (error) {
    return handleApiError(error, "login");
  }
}
