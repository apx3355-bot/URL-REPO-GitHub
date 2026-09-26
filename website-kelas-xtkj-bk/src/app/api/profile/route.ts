import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, parseBody, handleApiError, logActivity, jsonError } from "@/lib/api";
import { validateImageFile, AVATAR_MAX_BYTES } from "@/lib/image";

// ================================
// GET /api/profile — profil milik sendiri (butuh login).
// ================================
export async function GET() {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    const profile = await prisma.profile.findUnique({
      where: { userId: guard.user.id },
      select: {
        fullName: true,
        phone: true,
        bio: true,
        nisn: true,
        photo: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return handleApiError(error, "profile:get");
  }
}

// Username: aturan identik dengan register (unik, lowercase).
// Role/permission/userId TIDAK bisa diubah lewat endpoint ini — field asing di-strip zod,
// dan User.role hanya diubah lewat User Management (developer-only).
const updateSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(32)
    .regex(/^[a-z0-9_.]+$/i, "Username hanya boleh huruf, angka, titik, underscore"),
  phone: z
    .string()
    .trim()
    .regex(/^[\d+\-\s]{0,20}$/, "Nomor telepon tidak valid")
    .optional()
    .or(z.literal("")),
  bio: z.string().trim().max(300, "Bio maksimal 300 karakter").optional().or(z.literal("")),
  photo: z
    .string()
    .max(AVATAR_MAX_BYTES + 256, "Foto terlalu besar")
    .optional()
    .or(z.literal("")),
});

export async function PUT(request: Request) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, updateSchema);
    if (!body.ok) return body.response;

    const { fullName, username, phone, bio, photo } = body.data;
    const newUsername = username.toLowerCase();

    // Username konflik (dipakai user lain)?
    if (newUsername !== guard.user.username) {
      const taken = await prisma.user.findFirst({
        where: { username: newUsername, NOT: { id: guard.user.id } },
        select: { id: true },
      });
      if (taken) {
        return jsonError("Data tidak valid.", 400, {
          username: "Username sudah digunakan.",
        });
      }
    }

    // Avatar: validasi magic bytes di server (bukan percaya client), lalu strip prefix
    // agar disimpan sebagai base64 murni di kolom Profile.photo.
    let photoData: string | null = null;
    if (photo) {
      const check = validateImageFile(photo);
      if (!check.ok) {
        return jsonError("Data tidak valid.", 400, { photo: check.message });
      }
      photoData = photo.replace(/^data:image\/[a-z+]+;base64,/, "");
    }

    const usernameChanged = newUsername !== guard.user.username;

    // Maintenance V0.1 — sinkronisasi identitas SELALU: nama ClassMember
    // ter-link mengikuti profil anggota (satu sumber kebenaran = profil).
    // Brief: perubahan profil harus langsung tercermin di daftar anggota/
    // carousel beranda tanpa duplikasi data. Jabatan/foto member tidak disentuh.
    const shouldSyncMemberName = fullName.trim().length >= 2;

    // Transaksi interaktif — destruktur posisi (const [, profile]) rapuh:
    // saat username tidak berubah spread menambah 0 elemen sehingga upsert
    // bergeser ke index 0 dan destruktur menghasilkan undefined.
    const profile = await prisma.$transaction(async (tx) => {
      if (usernameChanged) {
        // Username adalah identifier login → update User, bukan Profile
        await tx.user.update({ where: { id: guard.user.id }, data: { username: newUsername } });
      }
      // Sinkronkan nama member placeholder → nama profil aktual (Maintenance V0.1)
      if (shouldSyncMemberName) {
        await tx.classMember.update({
          where: { userId: guard.user.id },
          data: { fullName },
        });
      }
      return tx.profile.upsert({
        where: { userId: guard.user.id },
        update: {
          fullName,
          phone: phone || null,
          bio: bio || null,
          ...(photo !== undefined ? { photo: photoData } : {}),
        },
        create: {
          userId: guard.user.id,
          fullName,
          phone: phone || null,
          bio: bio || null,
          photo: photoData,
        },
        select: { id: true, fullName: true, phone: true, bio: true, nisn: true, photo: true, updatedAt: true },
      });
    });

    await logActivity({
      userId: guard.user.id,
      action: usernameChanged ? "PROFILE_USERNAME_CHANGE" : "PROFILE_UPDATE",
      description: usernameChanged
        ? `${guard.user.username} mengubah username menjadi ${newUsername}`
        : `${guard.user.username} memperbarui profilnya`,
      targetType: "profile",
      targetId: profile.id,
    });

    return NextResponse.json({ profile, username: newUsername });
  } catch (error) {
    return handleApiError(error, "profile:update");
  }
}
