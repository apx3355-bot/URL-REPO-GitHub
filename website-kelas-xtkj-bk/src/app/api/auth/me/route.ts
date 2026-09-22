import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error, "me");
  }
}
