import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ notifications: [] });

  const notifications: string[] = [];

  if (session.role === "FREELANCER") {
    const hiredProjects = await prisma.project.findMany({
      where: { freelancer: { userId: session.userId }, status: "IN_PROGRESS" }
    });
    
    if (hiredProjects.length >0) {
      notifications.push(`Good news! You have been hired for ${hiredProjects.length} active project(s). Check your Workspaces.`);
    }
  }

  return NextResponse.json({ notifications });
}
