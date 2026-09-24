import type { Metadata } from "next";
import { classInfo } from "@/data/classInfo";
import { galleryItems as staticItems } from "@/data/gallery";
import GaleriClient from "./GaleriClient";
import type { GalleryItem } from "@/types";
import { prisma } from "@/lib/prisma";

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
  const items = await getGallery();
  return <GaleriClient items={items} />;
}
