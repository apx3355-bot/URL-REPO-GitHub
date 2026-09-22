import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/roles";
import {
  requireUser,
  handleApiError,
  logActivity,
  jsonError,
} from "@/lib/api";
import {
  MAX_UPLOAD_BYTES,
  isAllowedMime,
  detectImageType,
  saveUploadFile,
} from "@/lib/upload";

// GET /api/gallery?mine=1
// - Tanpa login / tanpa ?mine: hanya APPROVED (galeri publik)
// - Login + ?mine=1: item milik user (semua status)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine") === "1";

    if (mine) {
      const guard = await requireUser();
      if (!guard.ok) return guard.response;
      const items = await prisma.galleryItem.findMany({
        where: { userId: guard.user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ items });
    }

    const items = await prisma.galleryItem.findMany({
      where: { status: "APPROVED" },
      orderBy: { approvedAt: "desc" },
      take: 100,
      include: { user: { select: { profile: { select: { fullName: true } } } } },
    });
    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error, "gallery:list");
  }
}

// POST /api/gallery — upload foto (murid & developer; wali kelas tidak upload, hanya moderasi)
export async function POST(request: Request) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;
    if (!can(guard.user.role, "gallery", "upload")) {
      return jsonError("Anda tidak memiliki izin untuk mengunggah foto.", 403);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!(file instanceof File)) {
      return jsonError("File wajib dipilih.", 400, { file: "Pilih file foto." });
    }
    if (title.length < 3 || title.length > 100) {
      return jsonError("Data tidak valid.", 400, { title: "Judul minimal 3, maksimal 100 karakter." });
    }
    if (description.length > 300) {
      return jsonError("Data tidak valid.", 400, { description: "Deskripsi maksimal 300 karakter." });
    }

    // 1. Ukuran
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return jsonError("Ukuran file maksimal 5 MB.", 400, { file: "Ukuran file maksimal 5 MB." });
    }

    // 2. Deklarasi MIME
    if (!isAllowedMime(file.type)) {
      return jsonError(
        "Format tidak didukung. Gunakan JPG, PNG, atau WEBP.",
        400,
        { file: "Format tidak didukung. Gunakan JPG, PNG, atau WEBP." }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Magic bytes — jangan percaya extension/Declared MIME saja
    const realType = detectImageType(new Uint8Array(buffer));
    if (!realType || realType !== file.type) {
      return jsonError(
        "Isi file bukan gambar yang valid.",
        400,
        { file: "File bukan gambar yang valid." }
      );
    }

    const { publicPath } = await saveUploadFile(buffer, realType);

    // Moderasi: semua upload murid masuk PENDING (aturan moderasi eksplisit Phase 5)
    const item = await prisma.galleryItem.create({
      data: {
        userId: guard.user.id,
        imagePath: publicPath,
        title,
        description: description || null,
        status: "PENDING",
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "GALLERY_UPLOAD",
      description: `${guard.user.username} mengunggah foto "${title}" (menunggu moderasi)`,
      targetType: "gallery",
      targetId: item.id,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "gallery:upload");
  }
}
