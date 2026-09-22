import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, handleApiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const guard = await requirePermission("activityLogs", "read");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const takeParam = Number(searchParams.get("take") ?? 50);
    const take = Number.isInteger(takeParam)
      ? Math.min(Math.max(takeParam, 1), 200)
      : 50;

    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: {
        user: { select: { username: true, profile: { select: { fullName: true } } } },
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return handleApiError(error, "activity-logs:list");
  }
}
