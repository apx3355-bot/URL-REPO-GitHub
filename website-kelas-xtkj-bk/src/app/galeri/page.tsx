import type { Metadata } from "next";
import { classInfo } from "@/data/classInfo";
import { galleryItems as staticItems } from "@/data/gallery";
import GaleriClient from "./GaleriClient";
import type { GalleryItem } from "@/types";

export const metadata: Metadata = {
  title: "Galeri",
  description: `Dokumentasi kegiatan kelas ${classInfo.name} — foto praktik, acara sekolah, dan kegiatan kelas.`,
};

export const dynamic = "force-dynamic";

// Ambil galeri APPROVED dari database; fallback statis bila DB kosong/gagal
async function getGallery(): Promise<GalleryItem[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const res = await fetch(`${base}/api/gallery`, {
      cache: "no-store",
    });
    if (!res.ok) return staticItems;
    const data = await res.json();
    if (!data.items || data.items.length === 0) return staticItems;
    return data.items.map(
      (item: { id: number; imagePath: string; title: string; description: string | null; createdAt: string }) => ({
        id: item.id,
        image: item.imagePath,
        title: item.title,
        category: "Kegiatan Kelas" as const,
        date: item.createdAt,
        description: item.description ?? undefined,
      })
    );
  } catch {
    return staticItems;
  }
}

export default async function GaleriPage() {
  const items = await getGallery();
  return <GaleriClient items={items} />;
}
