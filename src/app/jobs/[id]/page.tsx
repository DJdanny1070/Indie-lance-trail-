import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import TopMatches from "@/components/TopMatches";

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }>}) {
  const session = await getSession();
  const resolvedParams = await params;
  const project = await prisma.project.findUnique({
    where: { id: resolvedParams.id },
    include: { employer: { include: { user: true } } }
  });

  if (!project) return <div className="container py-20 text-center text-xl">Project not found</div>;

  const handleSubmitProposal = async (formData: FormData) =>{
    "use server";
    const sessionLocal = await getSession();
    if (!sessionLocal || sessionLocal.role !== "FREELANCER") return;

    const coverLetter = formData.get("coverLetter") as string;
    const proposedRate = parseFloat(formData.get("proposedRate") as string);

    await prisma.proposal.create({
      data: {
        projectId: resolvedParams.id,
        freelancerId: sessionLocal.userId,
        coverLetter,
        proposedRate,
        status: "PENDING"
      }
    });

    redirect("/dashboard");
  };

  const hasApplied = session ? await prisma.proposal.findFirst({
    where: { projectId: resolvedParams.id, freelancerId: session.userId }
  }) : null;

  // Determine if the logged-in user is the employer of this project
  const isEmployer =
    session?.role === "EMPLOYER" &&
    (() =>{
      // We need to check if the session user is the employer of this project
      // We'll pass the employerUserId from the project's employer relation
      return project.employer.userId === session.userId;
    })();

  return (
    <div className="container py-12 max-w-4xl">
      <Link href="/jobs" className="text-muted text-sm mb-6 inline-flex hover:text-primary">
        ← Back to Jobs
      </Link>
      
      <div className="card glass mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
        <div className="text-muted flex gap-4 text-sm font-semibold mb-6">
          <span>Employer: {project.employer.user.name}</span>
          <span>•</span>
          <span>{project.budgetType}</span>
          <span>•</span>
          <span>₹{project.budgetMin} - ₹{project.budgetMax}</span>
        </div>
        
        <h3 className="text-lg font-bold mb-2">Description</h3>
        <p className="whitespace-pre-wrap text-muted mb-6">{project.description}</p>
        
        <h3 className="text-lg font-bold mb-2">Required Skills</h3>
        <div className="flex gap-2 mb-6 flex-wrap">
          {project.requiredSkills.split(",").map((s: string, i: number) =>(
            <span key={i} className="bg-primary-light text-primary px-3 py-1 rounded text-sm font-semibold">
              {s.trim()}
            </span>
          ))}
        </div>
      </div>

      {/* ── AI Top Matches (visible to the employer who owns this project) ── */}
      {isEmployer && project.status === "OPEN" && (
        <TopMatches
          jobId={project.id}
          projectTitle={project.title}
          topN={5}
        />
      )}

      {/* ── Proposal form (visible to freelancers) ── */}
      {session?.role === "FREELANCER" && (
        <div className="card glass animate-fade-in" style={{animationDelay: "0.1s"}}>
          <h2 className="text-2xl font-bold mb-6">Submit Proposal</h2>
          
          {hasApplied ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg font-medium text-center">
              You have already applied to this project! Check your dashboard for updates.
            </div>
          ) : (
            <form action={handleSubmitProposal} className="flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Cover Letter</label>
                <textarea 
                  name="coverLetter"
                  required 
                  rows={6}
                  className="form-textarea" 
                  placeholder="Explain why you're the best fit for this project..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Proposed Rate/Bid (₹)</label>
                <input 
                  name="proposedRate"
                  required 
                  type="number" 
                  className="form-input md:w-1/3" 
                  placeholder="e.g. 2000"
                />
              </div>
              <button type="submit" className="btn btn-primary mt-4 text-lg py-3 px-8">
                Submit Proposal
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
