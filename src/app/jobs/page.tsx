import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import Link from "next/link";
import {
  matchJobsToFreelancer,
  type FreelancerDoc,
  type JobDoc,
} from "@/lib/matchmaking";

export default async function FindWorkPage() {
  const session = await getSession();

  // ── Fetch open projects ──────────────────────────────────────────────────
  const allProjects = await prisma.project.findMany({
    where: { status: "OPEN" },
    include: { employer: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  // ── AI recommendations for freelancers ──────────────────────────────────
  let recommendedJobs: ReturnType<typeof matchJobsToFreelancer>= [];
  let freelancerProfile: FreelancerDoc | null = null;

  if (session?.role === "FREELANCER") {
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: session.userId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (profile && profile.skills) {
      freelancerProfile = {
        id: profile.id,
        userId: profile.userId,
        name: profile.user.name,
        skills: profile.skills,
        bio: profile.bio,
        availability: profile.availability,
        hourlyRate: profile.hourlyRate,
        portfolioUrl: profile.portfolioUrl,
      };

      const jobs: JobDoc[] = allProjects.map((p) =>({
        id: p.id,
        title: p.title,
        description: p.description,
        requiredSkills: p.requiredSkills,
      }));

      recommendedJobs = matchJobsToFreelancer(freelancerProfile, jobs, 5);
    }
  }

  // IDs of recommended jobs (to avoid duplication in main list)
  const recommendedIds = new Set(recommendedJobs.map((r) =>r.job.id));

  // Remaining projects (not in recommendations)
  const remainingProjects = allProjects.filter((p) =>!recommendedIds.has(p.id));

  return (
    <div className="container py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Find Work</h1>
        {freelancerProfile && (
          <span className="ai-badge-hero">AI Recommendations Active</span>
        )}
      </div>

      {!freelancerProfile && session?.role === "FREELANCER" && (
        <div className="bg-warning text-white p-4 rounded-lg mb-6 shadow-sm">
          <strong>Tip:</strong>Complete your profile skills to get AI-powered job recommendations!
        </div>
      )}

      {/* ── Recommended Jobs Section ── */}
      {recommendedJobs.length >0 && (
        <section className="recommended-section mb-10">
          <div className="recommended-header">
            <h2 className="text-xl font-bold" style={{ margin: 0 }}>Recommended For You</h2>
            <p className="text-sm text-muted" style={{ margin: "0.2rem 0 0" }}>
              Ranked by TF-IDF cosine similarity based on your skills &amp; bio
            </p>
          </div>

          <div className="flex-col gap-4" style={{ marginTop: "1rem" }}>
            {recommendedJobs.map(({ job, score, explanation }, idx) =>{
              const project = allProjects.find((p) =>p.id === job.id)!;
              return (
                <div
                  key={job.id}
                  className="rec-card glass animate-fade-in"
                  style={{ animationDelay: `${idx * 0.07}s`, marginBottom: "1rem" }}
                >
                  {/* Score badge */}
                  <div className="rec-score-badge" style={{
                    background: score >= 70 ? "var(--success)" : score >= 40 ? "var(--warning)" : "var(--accent)"
                  }}>
                    {score}% Match
                  </div>

                  <div className="flex gap-4 flex-wrap">
                    <div style={{ flex: 1 }}>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-xl font-semibold hover:text-primary transition-colors"
                        style={{ display: "block", marginBottom: "0.25rem" }}
                      >
                        {job.title}
                      </Link>
                      <div className="text-sm font-bold text-muted mb-2">
                        Posted by {project.employer.user.name}
                      </div>

                      {/* Match explanation */}
                      <div className="rec-explanation">
                         <strong>{explanation.skillOverlapPct}% skill match</strong>
                        {explanation.matchingSkills.length >0 && (
                          <>, shared skills: <em>{explanation.matchingSkills.slice(0, 4).join(", ")}</em></>
                        )}
                      </div>

                      {/* Skills */}
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {job.requiredSkills.split(",").map((skill: string, i: number) =>{
                          const isMatch = explanation.matchingSkills
                            .map((s) =>s.toLowerCase())
                            .includes(skill.trim().toLowerCase());
                          return (
                            <span
                              key={i}
                              className={`skill-tag ${isMatch ? "skill-tag--match" : ""}`}
                            >
                              {isMatch && " "}{skill.trim()}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      className="flex flex-col items-end justify-between"
                      style={{ minWidth: "120px" }}
                    >
                      <div className="text-sm font-bold" style={{ textAlign: "right" }}>
                        {project.budgetType === "FIXED" ? "Fixed Price" : "Hourly Rate"}
                        {project.budgetMin && (
                          <div className="text-muted" style={{ fontWeight: 400 }}>
                            ₹{project.budgetMin} – ₹{project.budgetMax}
                          </div>
                        )}
                      </div>
                      <Link href={`/jobs/${job.id}`} className="btn btn-primary" style={{ marginTop: "1rem" }}>
                        Apply Now
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── All Other Jobs ── */}
      <div>
        {remainingProjects.length === 0 && recommendedJobs.length === 0 ? (
          <div className="text-center py-20 text-muted">No open projects found.</div>
        ) : remainingProjects.length >0 ? (
          <>
            {recommendedJobs.length >0 && (
              <h2 className="text-xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
                All Open Jobs
              </h2>
            )}
            <div className="flex-col gap-6">
              {remainingProjects.map((project: any) =>(
                <div
                  key={project.id}
                  className="card glass flex flex-col md:flex-row justify-between gap-4 animate-fade-in relative overflow-hidden"
                  style={{ marginBottom: "1.5rem" }}
                >
                  <div className="md:w-3/4">
                    <Link href={`/jobs/${project.id}`} className="text-2xl font-semibold hover:text-primary transition-colors">
                      {project.title}
                    </Link>
                    <div className="text-sm font-bold text-muted mt-1 mb-3">
                      Posted by {project.employer.user.name}
                    </div>
                    <p className="text-muted leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {project.requiredSkills.split(",").map((skill: string, i: number) =>(
                        <span key={i} className="skill-tag">
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="md:w-1/4 flex flex-col items-start md:items-end justify-between border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-4">
                    <div className="text-lg font-bold">
                      {project.budgetType === "FIXED" ? "Fixed Price" : "Hourly Rate"}
                    </div>
                    <div className="text-muted text-sm space-y-1 mt-2 mb-4 md:text-right">
                      {project.budgetMin && <div>Min: ₹{project.budgetMin}</div>}
                      {project.budgetMax && <div>Max: ₹{project.budgetMax}</div>}
                    </div>
                    <Link href={`/jobs/${project.id}`} className="btn btn-primary btn-block text-center mt-auto">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
