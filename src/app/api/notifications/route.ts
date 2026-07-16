import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = parseInt(searchParams.get("userId") || "0", 10);

  if (!userId) {
    return NextResponse.json([]);
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(notifications);
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    return NextResponse.json([]);
  }
}
