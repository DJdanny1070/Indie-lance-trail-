import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      freelancerProfile: true,
      employerProfile: true
    }
  });

  if (!user) redirect("/login");

  // Onboarding Re-routing
  if (user.role === "FREELANCER" && user.freelancerProfile) {
    if (!user.freelancerProfile.skills || !user.freelancerProfile.upiId) {
      redirect("/onboarding/freelancer");
    }
  }

  if (user.role === "EMPLOYER" && user.employerProfile) {
    if (!user.employerProfile.companyName) {
      redirect("/onboarding/employer");
    }
  }

  let employerProjects: any[] = [];
  let freelancerProposals: any[] = [];
  let activeWorkspaces: any[] = [];

  if (user.role === "EMPLOYER" && user.employerProfile) {
    employerProjects = await prisma.project.findMany({
      where: { employerId: user.employerProfile.id },
      include: {
        proposals: { include: { freelancer: { include: { freelancerProfile: true } } } },
        workspaces: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  if (user.role === "FREELANCER") {
    freelancerProposals = await prisma.proposal.findMany({
      where: { freelancerId: user.id },
      include: { project: true },
      orderBy: { createdAt: "desc" }
    });
    
    const hiredProjects = await prisma.project.findMany({
      where: { freelancerId: user.freelancerProfile?.id, status: { not: "COMPLETED" } },
      include: { workspaces: true }
    });
    
    activeWorkspaces = hiredProjects.flatMap(p =>p.workspaces.map(w =>({ ...w, projectTitle: p.title })));
  }

  const handleAcceptProposal = async (formData: FormData) =>{
    "use server";
    const proposalId = formData.get("proposalId") as string;
    const projectId = formData.get("projectId") as string;
    const freelancerId = formData.get("freelancerId") as string;
    const freelancerProfileId = formData.get("freelancerProfileId") as string;

    if (!proposalId || !projectId || !freelancerId || !freelancerProfileId) {
      throw new Error("Missing required IDs to accept proposal.");
    }

    try {
      await prisma.proposal.update({
        where: { id: proposalId },
        data: { status: "ACCEPTED" }
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { status: "IN_PROGRESS", freelancerId: freelancerProfileId }
      });

      await prisma.workspace.create({
        data: { projectId, status: "ACTIVE" }
      });
    } catch (error) {
      console.error("Prisma Error (Accept Proposal):", error);
      throw new Error("Failed to accept proposal. P2003 or other constraint failed.");
    }
    
    redirect("/dashboard");
  };

  const handleDeleteProject = async (formData: FormData) =>{
    "use server";
    const projectId = formData.get("projectId") as string;
    if (!projectId || !user.employerProfile) return;

    try {
      await prisma.project.delete({
        where: { id: projectId, employerId: user.employerProfile.id }
      });
    } catch (e) {
      console.error(e);
    }
    redirect("/dashboard");
  };

  const handleWithdrawProposal = async (formData: FormData) =>{
    "use server";
    const proposalId = formData.get("proposalId") as string;
    if (!proposalId) return;

    try {
      await prisma.proposal.delete({
        where: { id: proposalId, freelancerId: user.id }
      });
    } catch (e) {
      console.error(e);
    }
    redirect("/dashboard");
  };

  return (
    <div className="container py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-muted flex gap-4 items-center">
          <span>Role: <span className="font-semibold text-primary">{user.role}</span></span>
          <form action={async () =>{
            "use server";
            const { logoutSession } = await import("@/lib/session");
            await logoutSession();
            redirect("/login");
          }}>
            <button type="submit" className="btn btn-outline border-red-200 text-danger hover:bg-red-50 text-sm py-1.5 px-4 rounded">Log Out</button>
          </form>
        </div>
      </div>

      {user.role === "FREELANCER" && (
        <div className="flex flex-col gap-8">
          <div className="card glass">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Active Workspaces</h2>
              <Link href="/freelancer/profile" className="btn btn-outline text-sm">Edit Profile</Link>
            </div>
            
            {activeWorkspaces.length === 0 ? (
              <p className="text-muted">No active workspaces. Get hired to start collaborating!</p>
            ) : (
              <ul className="space-y-3 mb-4">
                {activeWorkspaces.map(ws =>(
                  <li key={ws.id} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                    <span className="font-semibold">{ws.projectTitle}</span>
                    <Link href={`/workspace/${ws.id}`} className="btn btn-primary text-sm">Open Workspace</Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/freelancer/history" className="text-blue-600 hover:text-blue-800 text-sm font-semibold underline mt-2 inline-block">View Completed Projects (History)</Link>
          </div>

          <div className="card glass">
            <h2 className="text-xl font-bold mb-4">Your Proposals</h2>
            {freelancerProposals.length === 0 ? (
              <p className="text-muted">You haven't submitted any proposals yet.</p>
            ) : (
              <ul className="space-y-4">
                {freelancerProposals.map(p =>(
                  <li key={p.id} className="p-4 border rounded-lg flex justify-between">
                    <div>
                      <div className="font-bold">{p.project.title}</div>
                      <div className="text-sm text-muted">Proposed Rate: ₹{p.proposedRate}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={`font-bold ${p.status === "ACCEPTED" ? "text-success" : p.status === "REJECTED" ? "text-danger" : "text-warning"}`}>
                        {p.status}
                      </div>
                      {p.status === "PENDING" && (
                         <form action={handleWithdrawProposal}>
                           <input type="hidden" name="proposalId" value={p.id} />
                           <button type="submit" className="btn btn-outline border-red-200 text-danger text-xs px-3 py-1.5">Withdraw</button>
                         </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {user.role === "EMPLOYER" && (
        <div className="flex flex-col gap-8">
          <div className="card glass flex justify-between items-center">
             <h2 className="text-xl font-bold">Your Projects & Hiring</h2>
             <Link href="/employer/post-project" className="btn btn-primary text-sm">Post New Project</Link>
          </div>

          <div className="space-y-6">
            {employerProjects.length === 0 ? (
              <div className="text-muted text-center py-10">You haven't posted any projects yet.</div>
            ) : (
              employerProjects.map(project =>(
                <div key={project.id} className="card glass border-l-4 border-primary">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{project.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded font-bold ${project.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {project.status}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                      {project.status === "IN_PROGRESS" && project.workspaces.length >0 && (
                         <Link href={`/workspace/${project.workspaces[0].id}`} className="btn btn-success text-sm">
                           Open Workspace
                         </Link>
                      )}
                      {project.status === "OPEN" && (
                         <form action={handleDeleteProject}>
                           <input type="hidden" name="projectId" value={project.id} />
                           <button type="submit" className="btn btn-outline text-danger text-sm border-red-200 hover:bg-red-50">Delete Post</button>
                         </form>
                      )}
                    </div>
                  </div>

                  {project.status === "OPEN" && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Proposals ({project.proposals.length})</h4>
                      {project.proposals.length === 0 ? (
                        <p className="text-sm text-muted">No proposals yet.</p>
                      ) : (
                        <ul className="space-y-3">
                          {project.proposals.map((prop: any) =>(
                            <li key={prop.id} className="p-3 bg-gray-50 rounded border flex justify-between items-center">
                              <div>
                                <div className="font-bold">{prop.freelancer.name}</div>
                                <div className="text-sm text-muted line-clamp-1">{prop.coverLetter}</div>
                                <div className="text-sm font-semibold mt-1">Bid: ₹{prop.proposedRate}</div>
                              </div>
                              
                              {prop.status === "PENDING" && (
                                <form action={handleAcceptProposal}>
                                  <input type="hidden" name="proposalId" value={prop.id} />
                                  <input type="hidden" name="projectId" value={project.id} />
                                  <input type="hidden" name="freelancerId" value={prop.freelancer.id} />
                                  <input type="hidden" name="freelancerProfileId" value={prop.freelancer.freelancerProfile?.id || ""} />
                                  <button type="submit" className="btn btn-primary text-sm">Accept & Hire</button>
                                </form>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
