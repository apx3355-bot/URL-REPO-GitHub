import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, parseBody, handleApiError, logActivity } from "@/lib/api";

export async function GET() {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    const profile = await prisma.profile.findUnique({
      where: { userId: guard.user.id },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return handleApiError(error, "profile:get");
  }
}

const updateSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[\d+\-\s]{0,20}$/, "Nomor telepon tidak valid")
    .optional()
    .or(z.literal("")),
  bio: z.string().trim().max(300, "Bio maksimal 300 karakter").optional().or(z.literal("")),
});

export async function PUT(request: Request) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, updateSchema);
    if (!body.ok) return body.response;

    const profile = await prisma.profile.upsert({
      where: { userId: guard.user.id },
      update: {
        fullName: body.data.fullName,
        phone: body.data.phone || null,
        bio: body.data.bio || null,
      },
      create: {
        userId: guard.user.id,
        fullName: body.data.fullName,
        phone: body.data.phone || null,
        bio: body.data.bio || null,
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "PROFILE_UPDATE",
      description: `${guard.user.username} memperbarui profilnya`,
      targetType: "profile",
      targetId: profile.id,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return handleApiError(error, "profile:update");
  }
}
