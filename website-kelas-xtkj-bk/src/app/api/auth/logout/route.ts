import { NextResponse } from "next/server";
import { getSessionUser, destroySession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { handleApiError, logActivity } from "@/lib/api";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (user) {
      // Bump tokenVersion → token yang sama tidak bisa dipakai ulang
      // (mis. via tombol Back atau replay cookie) setelah logout.
      await prisma.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
      });
    }
    await destroySession();
    if (user) {
      await logActivity({
        userId: user.id,
        action: "LOGOUT",
        description: `${user.username} logout`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "logout");
  }
}
