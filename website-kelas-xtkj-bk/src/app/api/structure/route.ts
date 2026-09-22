import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  parseBody,
  handleApiError,
  logActivity,
} from "@/lib/api";
import { STRUCTURE_TIERS } from "@/lib/structure";

export async function GET() {
  try {
    const guard = await requirePermission("structure", "read");
    if (!guard.ok) return guard.response;

    const structure = await prisma.classStructure.findMany({
      orderBy: { order: "asc" },
      take: 100,
    });
    return NextResponse.json({ structure });
  } catch (error) {
    return handleApiError(error, "structure:list");
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  position: z.string().trim().min(2, "Jabatan minimal 2 karakter").max(60),
  tier: z.enum(STRUCTURE_TIERS),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).max(99).default(0),
});

export async function POST(request: Request) {
  try {
    const guard = await requirePermission("structure", "create");
    if (!guard.ok) return guard.response;

    const body = await parseBody(request, createSchema);
    if (!body.ok) return body.response;

    const entry = await prisma.classStructure.create({
      data: {
        name: body.data.name,
        position: body.data.position,
        tier: body.data.tier,
        description: body.data.description || null,
        order: body.data.order,
      },
    });

    await logActivity({
      userId: guard.user.id,
      action: "STRUCTURE_CREATE",
      description: `${guard.user.username} menambah struktur "${entry.position} — ${entry.name}"`,
      targetType: "structure",
      targetId: entry.id,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "structure:create");
  }
}
