import type { Metadata } from "next";
import { classInfo } from "@/data/classInfo";
import { galleryItems as staticItems } from "@/data/gallery";
import GaleriClient from "./GaleriClient";
import type { GalleryItem } from "@/types";
import { prisma } from "@/lib/prisma";
import PublicLayout from "@/components/PublicLayout";
import { getSessionUser } from "@/lib/session";
import { can } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Galeri",
  description: `Dokumentasi kegiatan kelas ${classInfo.name} — foto praktik, acara sekolah, dan kegiatan kelas.`,
};

export const dynamic = "force-dynamic";

// Ambil galeri APPROVED langsung dari database (query server-side;
// self-fetch ke /api/gallery rapuh terhadap env URL dan tidak diperlukan).
// Fallback statis bila DB kosong/gagal.
async function getGallery(): Promise<GalleryItem[]> {
  try {
    const items = await prisma.galleryItem.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    });
    if (items.length === 0) return staticItems;
    return items.map((item) => ({
      id: item.id,
      // Data URL (upload serverless) → serve via endpoint agar HTML ramping
      image: item.imagePath.startsWith("data:")
        ? `/api/gallery/image/${item.id}`
        : item.imagePath,
      title: item.title,
      category: "Kegiatan Kelas" as const,
      date: item.createdAt.toISOString(),
      description: item.description ?? undefined,
    }));
  } catch {
    return staticItems;
  }
}

export default async function GaleriPage() {
  // MAINTENANCE V0.2.1 — CTA upload di galeri publik: hanya untuk login dengan
  // gallery:upload (Developer/Wali/Murid). Server-side session check (bukan device).
  // Memecahkan kasus mobile: murid mencari fitur di /galeri (jalur navigasi alami
  // Beranda → Galeri), bukan di /dashboard/gallery.
  const [items, user] = await Promise.all([getGallery(), getSessionUser()]);
  const canUpload = user ? can(user.role, "gallery", "upload") : false;
  return (
    <PublicLayout>
      <GaleriClient items={items} canUpload={canUpload} />
    </PublicLayout>
  );
}
