import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, handleApiError } from "@/lib/api";
import { getQuotaStatus } from "@/lib/settings";

// GET /api/stats — developer only. Statistik sistem untuk control panel.
// Tidak ada data sensitif antar-role yang terekspos (hanya agregat).
export async function GET() {
  try {
    const guard = await requirePermission("settings", "read");
    if (!guard.ok) return guard.response;

    const [totalUsers, totalMurid, totalWali, totalDeveloper, totalMembers, pendingGallery, quota] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "ANGGOTA" } }),
        prisma.user.count({ where: { role: "WALI_KELAS" } }),
        prisma.user.count({ where: { role: "DEVELOPER" } }),
        prisma.classMember.count(),
        prisma.galleryItem.count({ where: { status: "PENDING" } }),
        getQuotaStatus(),
      ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalMurid,
        totalWali,
        totalDeveloper,
        totalMembers,
        pendingGallery,
      },
      quota,
    });
  } catch (error) {
    return handleApiError(error, "stats");
  }
}
