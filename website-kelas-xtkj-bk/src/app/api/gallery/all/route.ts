import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, handleApiError } from "@/lib/api";

// GET /api/gallery/all — daftar SEMUA foto (semua status) untuk Gallery
// Management moderator (Developer & Wali Kelas). Memecahkan bug legacy:
// foto APPROVED milik murid (mis. "portofolio") hanya terlihat di galeri
// publik, tidak di management yang sebelumnya hanya menampilkan
// `?mine=1` + antrian PENDING.
export async function GET() {
  try {
    const guard = await requirePermission("gallery", "moderate");
    if (!guard.ok) return guard.response;

    const items = await prisma.galleryItem.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { user: { select: { username: true, profile: { select: { fullName: true } } } } },
    });

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error, "gallery:all");
  }
}
