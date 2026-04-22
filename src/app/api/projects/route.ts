import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "EMPLOYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, requiredSkills, budgetType, budgetMin, budgetMax } = await req.json();

    if (!title || !description || !requiredSkills || !budgetType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const employerProfile = await prisma.employerProfile.findUnique({
      where: { userId: session.userId }
    });

    if (!employerProfile) {
      return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });
    }

    const project = await prisma.project.create({
      data: {
        employerId: employerProfile.id,
        title,
        description,
        requiredSkills,
        budgetType,
        budgetMin: budgetMin ? parseFloat(budgetMin) : null,
        budgetMax: budgetMax ? parseFloat(budgetMax) : null,
        status: "OPEN"
      }
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Create Project Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const projects = await prisma.project.findMany({
      where: { status: "OPEN" },
      include: {
        employer: {
          include: { user: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
