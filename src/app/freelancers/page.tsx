import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import Link from "next/link";

export default async function DiscoverFreelancersPage() {
  const freelancers = await prisma.freelancerProfile.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold mb-8">Discover Top Indian Talent</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {freelancers.length === 0 ? (
          <div className="col-span-full text-center py-20 text-muted">No freelancers found yet.</div>
        ) : (
          freelancers.map((profile) =>(
            <div key={profile.id} className="card glass animate-fade-in flex flex-col h-full">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex justify-center items-center text-xl font-bold">
                  {profile.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{profile.user.name}</h3>
                  <div className="text-sm text-muted">
                    {profile.hourlyRate ? `₹${profile.hourlyRate}/hr` : "Rate Negotiable"}
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted mb-4 flex-grow line-clamp-3">
                {profile.bio || "No professional bio provided yet."}
              </div>

              <div className="mb-4 flex gap-1 flex-wrap">
                {profile.skills ? profile.skills.split(",").slice(0, 4).map((skill: string, idx: number) =>(
                  <span key={idx} className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                    {skill.trim()}
                  </span>
                )) : <span className="text-xs text-muted italic">Skills not listed</span>}
              </div>

              <Link href={`/freelancer/${profile.userId}`} className="btn btn-outline btn-block mt-auto">
                View Profile
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
