import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, parseBody, handleApiError, logActivity, jsonError } from "@/lib/api";
import { ROLES } from "@/lib/roles";
import { getQuotaStatus } from "@/lib/settings";

const USER_SELECT = {
  id: true,
  username: true,
  role: true,
  isActive: true,
  inactiveReason: true,
  inactiveAt: true,
  createdAt: true,
  profile: { select: { fullName: true, nisn: true } },
} as const;

// GET /api/users?search=&role=&status= — developer only.
// TANPA passwordHash (tidak pernah diekspos).
export async function GET(request: Request) {
  try {
    const guard = await requirePermission("users", "read");
    if (!guard.ok) return guard.response;

    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const roleFilter = url.searchParams.get("role") || "";
    const statusFilter = url.searchParams.get("status") || ""; // active | inactive

    const users = await prisma.user.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { username: { contains: search } },
                { profile: { fullName: { contains: search } } },
              ],
            }
          : {}),
        ...(ROLES.includes(roleFilter as (typeof ROLES)[number]) ? { role: roleFilter } : {}),
        ...(statusFilter === "active"
          ? { isActive: true }
          : statusFilter === "inactive"
            ? { isActive: false }
            : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: USER_SELECT,
    });

    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error, "users:list");
  }
}

// POST /api/users — buat akun baru (Wali Kelas / Developer / Murid). Developer only.
// Ini satu-satunya jalur resmi pembuatan akun ber-privilege (bukan registrasi publik).
const createSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(32)
    .regex(/^[a-z0-9_.]+$/i, "Username hanya boleh huruf, angka, titik, underscore"),
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
  role: z.enum(["DEVELOPER", "WALI_KELAS", "ANGGOTA"]),
});

export async function POST(request: Request) {
  try {
    const guard = await requirePermission("users", "create");
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, createSchema);
    if (!body.ok) return body.response;

    const { username, fullName, password, role } = body.data;
    const normalizedUsername = username.toLowerCase();

    // Akun murid via panel developer juga menghormati kuota
    if (role === "ANGGOTA") {
      const quota = await getQuotaStatus();
      if (quota.full) {
        return jsonError("Kuota anggota kelas saat ini sudah penuh.", 403);
      }
    }

    const existing = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });
    if (existing) {
      return jsonError("Data tidak valid.", 400, { username: "Username sudah digunakan." });
    }

    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        role,
        passwordHash: await bcrypt.hash(password, 12),
        profile: { create: { fullName } },
      },
      select: USER_SELECT,
    });

    await logActivity({
      userId: guard.user.id,
      action: "USER_CREATED",
      description: `${guard.user.username} membuat akun ${role} baru: ${user.username}`,
      targetType: "user",
      targetId: user.id,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "users:create");
  }
}

// PATCH /api/users — ubah role / status / reset password. Developer only.
const updateSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(["DEVELOPER", "WALI_KELAS", "ANGGOTA"]).optional(),
  isActive: z.boolean().optional(),
  // Alasan penonaktifan (soft-delete) — wajib saat isActive: false
  reason: z.string().trim().min(3, "Alasan minimal 3 karakter").max(200).optional(),
  newPassword: z.string().min(8, "Password minimal 8 karakter").max(128).optional(),
});

export async function PATCH(request: Request) {
  try {
    const guard = await requirePermission("users", "update");
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, updateSchema);
    if (!body.ok) return body.response;

    const { userId, role, isActive, reason, newPassword } = body.data;
    if (role === undefined && isActive === undefined && reason === undefined && newPassword === undefined) {
      return jsonError("Tidak ada perubahan yang dikirim.", 400);
    }
    // Soft-delete: alasan wajib saat menonaktifkan, tidak boleh dikirim saat mengaktifkan
    if (isActive === false && (reason === undefined || reason.length < 3)) {
      return jsonError("Alasan penonaktifan wajib diisi (minimal 3 karakter).", 400, {
        reason: "Alasan penonaktifan wajib diisi.",
      });
    }
    if (isActive === true && reason !== undefined) {
      return jsonError("Alasan hanya berlaku saat menonaktifkan akun.", 400);
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, isActive: true },
    });
    if (!target) return jsonError("User tidak ditemukan.", 404);

    // Proteksi: developer tidak bisa menurunkan/deactivate akunnya sendiri
    // (mencegah terkunci dari sistem)
    const selfDegrade =
      target.id === guard.user.id &&
      (isActive === false || (role !== undefined && role !== "DEVELOPER"));
    if (selfDegrade) {
      return jsonError("Anda tidak dapat menonaktifkan atau menurunkan akun Anda sendiri.", 400);
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(isActive !== undefined
          ? {
              isActive,
              // Soft-delete: catat alasan & waktu; re-aktivasi membersihkan keduanya
              ...(isActive === false
                ? { inactiveReason: reason, inactiveAt: new Date() }
                : { inactiveReason: null, inactiveAt: null }),
            }
          : {}),
        // Reset password: bump tokenVersion → semua sesi lama target langsung invalid
        ...(newPassword !== undefined
          ? { passwordHash: await bcrypt.hash(newPassword, 12), tokenVersion: { increment: 1 } }
          : {}),
      },
      select: USER_SELECT,
    });

    // Password tidak pernah dicatat atau dikembalikan.
    if (role !== undefined && role !== target.role) {
      await logActivity({
        userId: guard.user.id,
        action: "ROLE_CHANGE",
        description: `${guard.user.username} mengubah role ${target.username}: ${target.role} → ${role}`,
        targetType: "user",
        targetId: target.id,
      });
    }
    if (isActive !== undefined && isActive !== target.isActive) {
      await logActivity({
        userId: guard.user.id,
        action: "USER_STATUS_CHANGE",
        description: `${guard.user.username} ${isActive ? "mengaktifkan kembali" : "menonaktifkan"} akun ${target.username}${
          !isActive && reason ? ` — alasan: ${reason}` : ""
        }`,
        targetType: "user",
        targetId: target.id,
      });
    }
    if (newPassword !== undefined) {
      await logActivity({
        userId: guard.user.id,
        action: "PASSWORD_RESET",
        description: `${guard.user.username} me-reset password akun ${target.username}`,
        targetType: "user",
        targetId: target.id,
      });
    }

    return NextResponse.json({ user: updated });
  } catch (error) {
    return handleApiError(error, "users:update");
  }
}

// DELETE /api/users — hapus akun permanen. Developer only.
// Guard berlapis (backend, bukan hanya UI):
//   1. Tidak bisa menghapus akun sendiri (anti lockout)
//   2. Developer terakhir tidak boleh dihapus (anti lockout sistem)
//   3. Konfirmasi: body wajib memuat username target PERSIS (type-to-confirm)
// Dampak cascade DB (sesuai onDelete schema): Profile & entri ClassMember ikut
// terhapus, foto galeri/diskusi/submission milik akun ikut terhapus,
// ActivityLog bertahan (user → null). tokenVersion tak relevan (akun hilang).
const deleteSchema = z.object({
  userId: z.number().int().positive(),
  confirmUsername: z.string().min(1, "Ketik username untuk konfirmasi").max(64),
});

export async function DELETE(request: Request) {
  try {
    const guard = await requirePermission("users", "delete");
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, deleteSchema);
    if (!body.ok) return body.response;

    const target = await prisma.user.findUnique({
      where: { id: body.data.userId },
      select: {
        id: true,
        username: true,
        role: true,
        profile: { select: { fullName: true } },
      },
    });
    if (!target) return jsonError("User tidak ditemukan.", 404);

    // 1. Anti lockout — developer tidak bisa menghapus akunnya sendiri
    if (target.id === guard.user.id) {
      return jsonError("Anda tidak dapat menghapus akun Anda sendiri.", 400);
    }

    // 2. Anti lockout sistem — Developer aktif terakhir tidak boleh dihapus
    if (target.role === "DEVELOPER") {
      const devCount = await prisma.user.count({
        where: { role: "DEVELOPER", isActive: true },
      });
      if (devCount <= 1) {
        return jsonError(
          "Tidak dapat menghapus satu-satunya akun Developer.",
          400
        );
      }
    }

    // 3. Type-to-confirm — username harus diketik persis
    if (body.data.confirmUsername !== target.username) {
      return jsonError("Konfirmasi username tidak cocok.", 400, {
        confirmUsername: `Ketik "${target.username}" persis untuk mengonfirmasi.`,
      });
    }

    // Ringkasan dampak untuk ActivityLog (member ter-link + foto galeri)
    const [galleryCount, linkedMember] = await Promise.all([
      prisma.galleryItem.count({ where: { userId: target.id } }),
      prisma.classMember.findUnique({
        where: { userId: target.id },
        select: { fullName: true },
      }),
    ]);

    await prisma.user.delete({ where: { id: target.id } });

    await logActivity({
      userId: guard.user.id,
      action: "USER_DELETED",
      description: `${guard.user.username} menghapus akun ${target.role} "${target.username}"${
        linkedMember ? ` — member "${linkedMember.fullName}" ikut terhapus` : ""
      }${galleryCount ? ` + ${galleryCount} foto galeri` : ""}`,
      targetType: "user",
      targetId: target.id,
    });

    return NextResponse.json({
      ok: true,
      message: `Akun @${target.username} dihapus permanen.`,
    });
  } catch (error) {
    return handleApiError(error, "users:delete");
  }
}
