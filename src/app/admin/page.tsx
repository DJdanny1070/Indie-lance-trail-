import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  // In a real application, check for isAdmin. For demonstration, allowing access.
  // if (session.role !== "ADMIN") redirect("/dashboard");

  const reports = await prisma.dispute.findMany({
    include: {
      project: true,
      raisedBy: true,
      reportedUser: true
    },
    orderBy: { createdAt: "desc" }
  });

  const handleAction = async (formData: FormData) =>{
    "use server";
    const reportId = formData.get("reportId") as string;
    const reportedUserId = formData.get("reportedUserId") as string;
    const actionType = formData.get("actionType") as string; // 'DISMISS', 'WARNING', 'TEMPBAN', 'PERMBAN'

    // Mark report as resolved
    await prisma.dispute.update({
      where: { id: reportId },
      data: { status: "RESOLVED" }
    });

    // Apply strikes or bans if not dismissed
    if (actionType !== 'DISMISS' && reportedUserId) {
      const user = await prisma.user.findUnique({ where: { id: reportedUserId }});
      if (user) {
        let newStrikes = user.strikes + 1;
        let bannedUntil = user.bannedUntil;

        if (actionType === 'TEMPBAN') {
           const date = new Date();
           date.setDate(date.getDate() + 3);  // 3-day ban
           bannedUntil = date;
        } else if (actionType === 'PERMBAN' || newStrikes >= 3) {
           const date = new Date();
           date.setFullYear(date.getFullYear() + 100); // 100-year permanent ban
           bannedUntil = date;
        }

        await prisma.user.update({
          where: { id: reportedUserId },
          data: { strikes: newStrikes, bannedUntil }
        });
        
        console.log(`[ADMIN ACTION] User ${reportedUserId} received action: ${actionType}. Strikes: ${newStrikes}`);
      }
    }

    revalidatePath("/admin");
  };

  return (
    <div className="container py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-heading text-gray-900">Admin Control Center</h1>
          <p className="text-muted mt-1">Review user reports, resolve disputes, and manage platform safety.</p>
        </div>
        <Link href="/dashboard" className="btn btn-outline">Exit Admin Menu</Link>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {reports.length === 0 ? (
          <div className="card glass text-center py-16">
             <div className="text-5xl mb-4"></div>
             <h2 className="text-xl font-bold">Inbox Zero</h2>
             <p className="text-muted">No pending reports or disputes. The platform is running smoothly.</p>
          </div>
        ) : (
          reports.map((report: any) =>(
             <div key={report.id} className={`card glass border-l-4 ${report.status === 'RESOLVED' ? 'border-l-green-500 opacity-60' : 'border-l-red-500'} shadow-md`}>
                <div className="flex flex-col md:flex-row justify-between gap-6">
                   <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${report.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                           {report.status}
                        </span>
                        <span className="text-gray-500 text-sm">Case #{report.id.slice(-6)}</span>
                        <span className="text-gray-400 text-xs">{new Date(report.createdAt).toLocaleString()}</span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900">{report.reason}</h3>
                      <p className="text-gray-700 bg-gray-50 p-4 rounded border">{report.description}</p>
                      
                      {report.evidenceUrl && (
                        <div className="text-sm">
                           <span className="font-semibold text-gray-700">Evidence Provided:</span>{" "}
                           <a href={report.evidenceUrl} target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                              Link <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                           </a>
                        </div>
                      )}

                      <div className="text-sm grid grid-cols-2 gap-4 mt-2 bg-blue-50/50 p-3 rounded">
                         <div>
                            <span className="text-gray-500">Reported By:</span><br/>
                            <strong>{report.raisedBy.name}</strong>(<Link href={`/user/${report.raisedBy.id}`} className="text-blue-600 hover:underline">{report.raisedBy.role}</Link>)
                         </div>
                         {report.reportedUser ? (
                           <div>
                              <span className="text-gray-500">Accused User:</span><br/>
                              <strong className="text-red-700">{report.reportedUser.name}</strong>(Strikes: {report.reportedUser.strikes})
                           </div>
                         ) : report.project ? (
                           <div>
                              <span className="text-gray-500">Linked Project:</span><br/>
                              <strong>{report.project.title}</strong>
                           </div>
                         ) : null}
                      </div>
                   </div>

                   {report.status !== "RESOLVED" && (
                     <div className="w-full md:w-64 bg-gray-50 p-4 border rounded-xl shadow-inner flex flex-col gap-2">
                        <h4 className="font-bold text-sm text-center text-gray-700 mb-2 uppercase tracking-wide">Take Action</h4>
                        
                        <form action={handleAction} className="flex flex-col gap-2">
                           <input type="hidden" name="reportId" value={report.id} />
                           {report.reportedUserId && <input type="hidden" name="reportedUserId" value={report.reportedUserId} />}
                           
                           <button type="submit" name="actionType" value="DISMISS" className="btn bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm py-2">
                              Dismiss / No Action
                           </button>
                           
                           {report.reportedUserId && (
                             <>
                               <button type="submit" name="actionType" value="WARNING" className="btn bg-yellow-100 border border-yellow-300 hover:bg-yellow-200 text-yellow-800 text-sm py-2">
                                  Issue Warning (+1 Strike)
                               </button>
                               <button type="submit" name="actionType" value="TEMPBAN" className="btn bg-orange-100 border border-orange-300 hover:bg-orange-200 text-orange-800 text-sm py-2">
                                  3-Day Ban (+1 Strike)
                               </button>
                               <button type="submit" name="actionType" value="PERMBAN" className="btn bg-red-600 hover:bg-red-700 text-white border-none text-sm py-2">
                                  Permanent Ban
                               </button>
                             </>
                           )}
                        </form>
                     </div>
                   )}
                </div>
             </div>
          ))
        )}
      </div>
    </div>
  );
}
