/**
 * GET /api/recommended-jobs
 * Returns recommended open jobs for the currently logged-in freelancer.
 * Uses all-MiniLM-L6-v2 (Python service) → TF-IDF fallback.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { aiRecommendJobs } from "@/lib/ai-client";
import type { FreelancerDoc, JobDoc } from "@/lib/matchmaking";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "FREELANCER") {
      return NextResponse.json({ recommendations: [], model: "none" });
    }

    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: session.userId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!profile || !profile.skills) {
      return NextResponse.json({ recommendations: [], model: "none" });
    }

    const openProjects = await prisma.project.findMany({
      where: { status: "OPEN" },
    });

    const freelancer: FreelancerDoc = {
      id: profile.id,
      userId: profile.userId,
      name: profile.user.name,
      skills: profile.skills,
      bio: profile.bio,
      availability: profile.availability,
      hourlyRate: profile.hourlyRate,
      portfolioUrl: profile.portfolioUrl,
    };

    const jobs: JobDoc[] = openProjects.map((p) =>({
      id: p.id,
      title: p.title,
      description: p.description,
      requiredSkills: p.requiredSkills,
    }));

    const { recommendations, model } = await aiRecommendJobs(freelancer, jobs, 5);

    return NextResponse.json({ recommendations, model });
  } catch (err) {
    console.error("[recommended-jobs] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
