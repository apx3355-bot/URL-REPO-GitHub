import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, handleApiError } from "@/lib/api";

// Jumlah foto menunggu moderasi — untuk badge sidebar (polling ringan).
// MAINTENANCE audit performa: badge hanya butuh ANGKA. Endpoint lama
// /api/gallery/moderation menarik seluruh baris (termasuk imagePath yang bisa
// berupa data URL megabyte) tiap polling — boros query & bandwidth.
// Count agregat: satu query, tanpa payload gambar. Permission sama (moderate).
export async function GET() {
  try {
    const guard = await requirePermission("gallery", "moderate");
    if (!guard.ok) return guard.response;

    const count = await prisma.galleryItem.count({
      where: { status: "PENDING" },
    });

    return NextResponse.json({ count });
  } catch (error) {
    return handleApiError(error, "gallery:pending-count");
  }
}
