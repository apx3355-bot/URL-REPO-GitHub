import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  parseBody,
  handleApiError,
  logActivity,
} from "@/lib/api";

export async function GET() {
  try {
    const guard = await requirePermission("members", "read");
    if (!guard.ok) return guard.response;

    const members = await prisma.classMember.findMany({
      orderBy: [{ position: "desc" }, { fullName: "asc" }],
      take: 200,
    });
    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error, "members:list");
  }
}

const createSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  nisn: z
    .string()
    .trim()
    .regex(/^\d{0,10}$/, "NISN harus angka maksimal 10 digit")
    .optional()
    .or(z.literal("")),
  position: z.string().trim().max(50, "Jabatan maksimal 50 karakter").optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const guard = await requirePermission("members", "create");
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, createSchema);
    if (!body.ok) return body.response;

    const member = await prisma.classMember.create({
      data: {
        fullName: body.data.fullName,
        nisn: body.data.nisn || null,
        position: body.data.position || null,
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "MEMBER_CREATE",
      description: `${guard.user.username} menambah anggota "${member.fullName}"`,
      targetType: "member",
      targetId: member.id,
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "members:create");
  }
}
