import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function EmployerProfilePage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;
  
  const user = await prisma.user.findUnique({
    where: { id },
    include: { 
      employerProfile: {
        include: { projects: { where: { status: "OPEN" } } }
      },
      reviewsReceived: true
    }
  });

  if (!user || user.role !== "EMPLOYER" || !user.employerProfile) {
    return notFound();
  }

  const { employerProfile, reviewsReceived } = user;
  const reviews = reviewsReceived || [];
  const avgRating = reviews.length >0 ? (reviews.reduce((a: any, b: any) =>a + b.rating, 0) / reviews.length).toFixed(1) : "No ratings yet";

  return (
    <div className="container py-12">
      <div className="card glass max-w-3xl mx-auto border-t-4 border-t-primary shadow-xl">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold">{employerProfile.companyName || user.name}</h1>
          <div className="bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-full text-sm">
             {avgRating} {reviews.length >0 && `(${reviews.length})`}
          </div>
        </div>
        <p className="text-muted mb-1">Employer Profile</p>
        <p className="text-sm text-gray-500 mb-6">{user.email}</p>

        <div className="mb-8 p-4 bg-gray-50 rounded-lg border">
          <h2 className="text-xl font-semibold mb-2">About the Company</h2>
          <p className="text-gray-700 leading-relaxed">{employerProfile.description || "No description provided."}</p>
          {employerProfile.website ? (
            <p className="mt-2 text-blue-500 hover:underline">
              <a href={employerProfile.website.startsWith('http') ? employerProfile.website : `https://${employerProfile.website}`} target="_blank" rel="noreferrer">
                {employerProfile.website}
              </a>
            </p>
          ) : (
            session && session.userId === user.id && (
              <form action={async (formData: FormData) =>{
                "use server";
                const website = formData.get("website") as string;
                if (!website) return;
                const prisma = (await import("@/lib/prisma")).default;
                const { revalidatePath } = await import("next/cache");
                await prisma.employerProfile.update({
                  where: { userId: session.userId },
                  data: { website }
                });
                revalidatePath(`/employer/${id}`);
              }} className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800 font-semibold mb-3">Reminder: Please provide your company website to help build trust.</p>
                <div className="flex gap-2 items-center">
                  <input name="website" type="text" placeholder="e.g. example.com" className="form-input flex-1 px-3 py-2 text-sm border rounded bg-white" />
                  <button type="submit" className="btn btn-primary text-sm whitespace-nowrap shadow-sm">Save Website</button>
                </div>
              </form>
            )
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Open Projects ({employerProfile.projects.length})</h2>
          {employerProfile.projects.length === 0 ? (
            <p className="text-muted">No open projects at the moment.</p>
          ) : (
            <ul className="space-y-4">
              {employerProfile.projects.map((project: any) =>(
                <li key={project.id} className="p-4 border rounded hover:border-blue-300 transition-colors relative">
                  <h3 className="font-bold">{project.title}</h3>
                  <p className="text-sm text-muted mt-1">{project.description}</p>
                  <Link href={`/jobs/${project.id}`} className="absolute inset-0 z-10">
                    <span className="sr-only">View Project</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 pt-6 border-t flex justify-end relative z-20">
          <Link href={`/messages?userId=${id}`} className="btn btn-primary">Message</Link>
        </div>
      </div>

      {/* Report User Form */}
      {session && session.userId !== user.id && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <details className="group">
             <summary className="text-red-500 font-semibold cursor-pointer list-none hover:underline flex items-center gap-2">
                Report this user
             </summary>
             <form action={async (formData: FormData) =>{
                "use server";
                const reason = formData.get("reason") as string;
                const description = formData.get("description") as string;
                const evidenceUrl = formData.get("evidenceUrl") as string;
                const { getSession } = await import("@/lib/session");
                const { revalidatePath } = await import("next/cache");
                const currentSession = await getSession();
                if(!currentSession) return;
                
                await prisma.dispute.create({
                   data: {
                      reportedUserId: user.id,
                      raisedById: currentSession.userId,
                      reason,
                      description,
                      evidenceUrl
                   }
                });
                revalidatePath(`/employer/${params.id}`);
             }} className="mt-4 card glass border-red-200 bg-red-50/50 p-6 max-w-lg">
                 <h4 className="font-bold text-red-800 mb-3 text-lg border-b border-red-200 pb-2">Submit a Report</h4>
                 <select name="reason" className="form-input mb-3 bg-white" required defaultValue="">
                   <option value="" disabled>Select a reason...</option>
                   <option value="Fake Profile">Fake Profile / Identity Theft</option>
                   <option value="Spam">Spam</option>
                   <option value="Off-platform Payment Request">Off-platform Payment Request</option>
                   <option value="Harassment/Abuse">Harassment / Abuse</option>
                   <option value="Other">Other</option>
                 </select>
                 <textarea name="description" className="form-input mb-3 bg-white" placeholder="Provide details..." required rows={3}></textarea>
                 <input name="evidenceUrl" type="url" className="form-input mb-4 bg-white" placeholder="Evidence URL (Optional)" />
                 <button type="submit" className="btn btn-sm text-white bg-red-600 hover:bg-red-700 shadow-md">Submit Report</button>
                 <p className="text-[10px] text-gray-500 mt-2">Reports are reviewed by moderators. False reports may lead to penalties.</p>
             </form>
          </details>
        </div>
      )}
    </div>
  );
}
