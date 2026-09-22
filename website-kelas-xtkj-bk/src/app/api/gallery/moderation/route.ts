import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, handleApiError } from "@/lib/api";

// Queue moderasi — developer & wali kelas
export async function GET() {
  try {
    const guard = await requirePermission("gallery", "moderate");
    if (!guard.ok) return guard.response;

    const items = await prisma.galleryItem.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { user: { select: { username: true, profile: { select: { fullName: true } } } } },
    });

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error, "gallery:moderation");
  }
}
