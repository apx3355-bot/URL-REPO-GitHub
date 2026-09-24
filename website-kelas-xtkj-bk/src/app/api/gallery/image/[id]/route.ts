import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { can } from "@/lib/roles";

// GET /api/gallery/image/[id] — serve gambar galeri yang tersimpan sebagai
// data URL di DB (fallback serverless — filesystem Vercel read-only).
// Akses: APPROVED = publik; PENDING/REJECTED = hanya pemilik item atau
// moderator (konsisten dengan aturan akses item di API).
const DATAURL_MARKER = "base64,";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Ekstrak MIME dari data URL; fallback ke ekstensi path virtual. */
function mimeOf(dataUrl: string, filename: string): string | null {
  const m = /^data:([a-z]+\/[a-z0-9+-]+);/i.exec(dataUrl);
  if (m) return m[1];
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number(id);
    // Hanya id numerik positif — hindari query aneh ke DB
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return new NextResponse("Not found", { status: 404 });
    }

    const item = await prisma.galleryItem.findUnique({
      where: { id: numericId },
      select: { imagePath: true, status: true, userId: true },
    });

    // APPROVED = publik. PENDING/REJECTED = hanya pemilik atau moderator
    // (gallery:moderate) — publik tidak bisa mengintip foto belum-moderasi.
    if (!item || !item.imagePath.startsWith("data:")) {
      return new NextResponse("Not found", { status: 404 });
    }
    if (item.status !== "APPROVED") {
      const user = await getSessionUser();
      const isOwner = user?.id === item.userId;
      const isModerator = user ? can(user.role, "gallery", "moderate") : false;
      if (!isOwner && !isModerator) {
        return new NextResponse("Not found", { status: 404 });
      }
    }

    const mime = mimeOf(item.imagePath, id);
    const base64 = item.imagePath.slice(
      item.imagePath.indexOf(DATAURL_MARKER) + DATAURL_MARKER.length
    );
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime ?? "application/octet-stream",
        "Content-Length": String(buffer.length),
        // Konten item bersifat statis — cache aman di CDN
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Server error", { status: 500 });
  }
}
