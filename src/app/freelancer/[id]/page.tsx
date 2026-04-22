import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function FreelancerProfilePage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;
  
  const user = await prisma.user.findUnique({
    where: { id },
    include: { 
      freelancerProfile: true,
      reviewsReceived: true 
    }
  });

  if (!user || user.role !== "FREELANCER" || !user.freelancerProfile) {
    return notFound();
  }

  const { freelancerProfile, reviewsReceived } = user;
  const reviews = reviewsReceived || [];
  const avgRating = reviews.length >0 ? (reviews.reduce((a: any, b: any) =>a + b.rating, 0) / reviews.length).toFixed(1) : "No ratings yet";

  return (
    <div className="container py-12">
      <div className="card glass max-w-3xl mx-auto border-t-4 border-t-primary shadow-xl">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <div className="bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-full text-sm">
             {avgRating} {reviews.length >0 && `(${reviews.length})`}
          </div>
        </div>
        <p className="text-muted mb-1">Freelancer Profile</p>
        <p className="text-sm text-gray-500 mb-6">{user.email}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">About</h2>
            <p className="text-gray-700 leading-relaxed">{freelancerProfile.bio || "No bio provided."}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Details</h2>
            <ul className="space-y-2 text-sm md:text-base">
              <li><strong className="text-gray-700">Skills:</strong>{freelancerProfile.skills || "N/A"}</li>
              <li><strong className="text-gray-700">Hourly Rate:</strong>{freelancerProfile.hourlyRate ? `₹${freelancerProfile.hourlyRate}` : "Negotiable"}</li>
              <li><strong className="text-gray-700">Availability:</strong>{freelancerProfile.availability || "Not stated"}</li>
              {freelancerProfile.portfolioUrl && (
                <li><strong className="text-gray-700">Portfolio:</strong><a href={freelancerProfile.portfolioUrl} className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">View Portfolio</a></li>
              )}
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t flex justify-end">
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
                revalidatePath(`/freelancer/${params.id}`);
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
