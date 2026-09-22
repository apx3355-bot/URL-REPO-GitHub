import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Health endpoint — status komponen berdasarkan pemeriksaan nyata.
export const dynamic = "force-dynamic";

export async function GET() {
  let database = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "disconnected";
  }

  // API operational = route ini bisa merespons
  return NextResponse.json({
    status: database === "connected" ? "ok" : "degraded",
    components: {
      api: "operational",
      database,
    },
    timestamp: new Date().toISOString(),
  });
}
