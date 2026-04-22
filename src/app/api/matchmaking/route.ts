/**
 * POST /api/matchmaking
 * Body : { jobId: string, topN?: number }
 * Returns: { matches: MatchResult[], model: string }
 *
 * Tries all-MiniLM-L6-v2 neural embeddings (Python service @ :8765) first.
 * Falls back to TF-IDF + cosine similarity if the service is offline.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { aiMatchFreelancers } from "@/lib/ai-client";
import type { FreelancerDoc, JobDoc } from "@/lib/matchmaking";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, topN = 5 } = body as { jobId: string; topN?: number };

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: jobId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const profiles = await prisma.freelancerProfile.findMany({
      include: { user: { select: { id: true, name: true } } },
    });

    const job: JobDoc = {
      id: project.id,
      title: project.title,
      description: project.description,
      requiredSkills: project.requiredSkills,
    };

    const freelancers: FreelancerDoc[] = profiles.map((p) =>({
      id: p.id,
      userId: p.userId,
      name: p.user.name,
      skills: p.skills,
      bio: p.bio,
      availability: p.availability,
      hourlyRate: p.hourlyRate,
      portfolioUrl: p.portfolioUrl,
    }));

    const { matches, model } = await aiMatchFreelancers(job, freelancers, topN);

    return NextResponse.json({ matches, model });
  } catch (err) {
    console.error("[matchmaking] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
