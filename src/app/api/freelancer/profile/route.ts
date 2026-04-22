import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "FREELANCER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { skills, hourlyRate, bio, availability, portfolioUrl } = await req.json();

    const profile = await prisma.freelancerProfile.update({
      where: { userId: session.userId },
      data: {
        skills,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        bio,
        availability,
        portfolioUrl
      }
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Profile Update Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "FREELANCER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: session.userId }
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
