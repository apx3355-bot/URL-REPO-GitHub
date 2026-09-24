import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, parseBody, handleApiError, logActivity, jsonError } from "@/lib/api";

// ================================
// POST /api/profile/password — ganti password milik sendiri.
// - Verifikasi password lama (tanpa bocorkan mana yang salah secara spesifik
//   selain field-level, karena user sudah terautentikasi via session).
// - Setelah sukses: tokenVersion naik → SEMUA session lama invalid
//   (mekanisme yang sama dengan reset password developer, Phase 6).
// - Password tidak pernah dicatat di activity log.
// ================================

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi").max(128),
    newPassword: z.string().min(8, "Password baru minimal 8 karakter").max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Konfirmasi password baru tidak cocok",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, changePasswordSchema);
    if (!body.ok) return body.response;

    const { currentPassword, newPassword } = body.data;

    const user = await prisma.user.findUnique({
      where: { id: guard.user.id },
      select: { passwordHash: true, tokenVersion: true },
    });
    if (!user) {
      return handleApiError(new Error("user missing"), "profile:password");
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return jsonError("Data tidak valid.", 400, {
        currentPassword: "Password saat ini salah.",
      });
    }

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return jsonError("Data tidak valid.", 400, {
        newPassword: "Password baru tidak boleh sama dengan yang lama.",
      });
    }

    await prisma.user.update({
      where: { id: guard.user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        // Invalidate semua session di semua perangkat
        tokenVersion: { increment: 1 },
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "PASSWORD_CHANGE_SELF",
      description: `${guard.user.username} mengubah passwordnya sendiri`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "profile:password");
  }
}
