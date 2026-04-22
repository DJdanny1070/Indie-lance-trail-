import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function FreelancerHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      freelancerProfile: true,
    }
  });

  if (!user || user.role !== "FREELANCER" || !user.freelancerProfile) {
    redirect("/dashboard");
  }

  // Fetch only COMPLETED projects
  const completedProjects = await prisma.project.findMany({
    where: { 
      freelancerId: user.freelancerProfile.id,
      status: "COMPLETED"
    },
    include: { workspaces: true },
    orderBy: { createdAt: "desc" }
  });

  const completedWorkspaces = completedProjects.flatMap(p =>
    p.workspaces.map(w =>({ ...w, projectTitle: p.title }))
  );

  return (
    <div className="container py-12 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Project History</h1>
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-800 text-sm font-semibold">
           &larr; Back to Dashboard
        </Link>
      </div>

      <div className="card glass">
        <h2 className="text-xl font-bold mb-4">Completed Projects</h2>
        
        {completedWorkspaces.length === 0 ? (
          <p className="text-muted">You have no completed projects yet in your history.</p>
        ) : (
          <ul className="space-y-4">
            {completedWorkspaces.map(ws =>(
              <li key={ws.id} className="p-5 border rounded-lg bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{ws.projectTitle}</h3>
                  <div className="text-xs text-gray-500 mt-1">
                    Completed Status • <Link href={`/workspace/${ws.id}`} className="text-blue-600 hover:underline">View old workspace chat</Link>
                  </div>
                </div>
                <div className="text-sm font-semibold px-3 py-1 bg-green-100 text-green-800 rounded">
                  FINISHED
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
