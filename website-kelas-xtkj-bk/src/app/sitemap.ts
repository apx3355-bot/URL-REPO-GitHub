import type { MetadataRoute } from "next";

// Sitemap halaman publik — area private (dashboard/api) tidak disertakan.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://website-kelas-xtkj-bk.vercel.app";
  return ["", "/struktur", "/anggota", "/galeri", "/tentang"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
}
