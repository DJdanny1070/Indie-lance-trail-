import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import WorkspaceChat from "./WorkspaceChat";

export default async function WorkspacePage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const resolvedParams = await Promise.resolve(params);
  const workspaceId = resolvedParams.id;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      project: {
        include: {
          employer: { include: { user: true } },
          freelancer: { include: { user: true } },
          revisionRequests: true,
          reviews: true,
          disputes: true
        }
      }
    }
  });

  if (!workspace) redirect("/dashboard");

  const isEmployer = workspace.project.employer.userId === session.userId;
  const isFreelancer = workspace.project.freelancer?.userId === session.userId;
  const isAdmin = session.role === "ADMIN";

  if (!isEmployer && !isFreelancer && !isAdmin) {
    redirect("/dashboard");
  }

  // --- ACTIONS ---

  const handleCompleteProject = async () =>{
    "use server";
    await prisma.project.update({
      where: { id: workspace.projectId },
      data: { status: "COMPLETED" }
    });
    revalidatePath(`/workspace/${workspaceId}`);
  };

  const handleRequestRevision = async (formData: FormData) =>{
    "use server";
    const description = formData.get("description") as string;
    if (workspace.project.revisionsAllowed <= 0) return;

    await prisma.$transaction([
      prisma.revisionRequest.create({
        data: { projectId: workspace.projectId, description }
      }),
      prisma.project.update({
        where: { id: workspace.projectId },
        data: { revisionsAllowed: workspace.project.revisionsAllowed - 1 }
      })
    ]);
    revalidatePath(`/workspace/${workspaceId}`);
  };

  const handleRaiseDispute = async (formData: FormData) =>{
    "use server";
    const reportedUserId = formData.get("reportedUserId") as string;
    const reason = formData.get("reason") as string;
    const description = formData.get("description") as string;
    const evidenceUrl = formData.get("evidenceUrl") as string;

    await prisma.dispute.create({
      data: {
        projectId: workspace.projectId,
        reportedUserId,
        raisedById: session.userId,
        reason,
        description,
        evidenceUrl
      }
    });
    revalidatePath(`/workspace/${workspaceId}`);
  };

  const handleConfirmPayment = async () =>{
    "use server";
    await prisma.project.update({
      where: { id: workspace.projectId },
      data: { paymentStatus: "CONFIRMED", status: "IN_PROGRESS" }
    });
    revalidatePath(`/workspace/${workspaceId}`);
  };

  const handleSubmitReview = async (formData: FormData) =>{
    "use server";
    const rating = parseInt(formData.get("rating") as string);
    const text = formData.get("text") as string;

    const revieweeId = isEmployer
      ? workspace.project.freelancer?.user.id
      : workspace.project.employer.user.id;

    if (!revieweeId) return;

    await prisma.review.create({
      data: {
        projectId: workspace.projectId,
        reviewerId: session.userId,
        revieweeId,
        rating,
        text
      }
    });
    revalidatePath(`/workspace/${workspaceId}`);
  };

  const opponentId = isEmployer
    ? workspace.project.freelancer?.user.id
    : workspace.project.employer.user.id;

  const hasReviewed = workspace.project.reviews.some((r: any) =>r.reviewerId === session.userId);
  const existingDispute = workspace.project.disputes.find((d: any) =>d.raisedById === session.userId);

  return (
    <div style={{ height: "calc(100vh - 65px)", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--background)" }}>
      <style dangerouslySetInnerHTML={{__html: `
        .ws-scrollbar::-webkit-scrollbar { width: 5px; }
        .ws-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .ws-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(99,102,241,0.25); border-radius: 10px; }
        .ws-grid { display: grid; grid-template-columns: 280px 1fr 300px; height: 100%; gap: 0; }
        @media (max-width: 900px) { .ws-grid { grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; } }
        .ws-panel { overflow-y: auto; }
        .ws-left { border-right: 1px solid var(--card-border); }
        .ws-right { border-left: 1px solid var(--card-border); }
        .msg-mine { background: var(--primary); color: white; border-radius: 20px 20px 4px 20px; }
        .msg-theirs { background: var(--card-bg); color: var(--foreground); border: 1px solid var(--card-border); border-radius: 20px 20px 20px 4px; }
        .status-badge { display:inline-flex; align-items:center; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
      `}} />

      <div className="ws-grid">

        {/* ===== LEFT PANEL ===== */}
        <div className="ws-panel ws-left ws-scrollbar" style={{ padding: "24px 20px", background: "var(--card-bg)" }}>
          <Link href="/dashboard" style={{ color: "var(--primary)", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", marginBottom: "20px", opacity: 0.85 }}>
            ← Back to Dashboard
          </Link>

          {/* EMPLOYER LEFT: Instructions for what to do */}
          {isEmployer && (
            <div style={{ marginBottom: "20px", padding: "16px", background: "var(--primary-light)", borderRadius: "14px", border: "1px solid var(--primary)" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span></span>Next Steps for You
              </h3>
              <ol style={{ paddingLeft: "16px", fontSize: "12px", lineHeight: 1.7, color: "var(--foreground)", opacity: 0.85 }}>
                <li>Discuss project requirements in the chat</li>
                <li>Send payment using the QR code below</li>
                <li>Wait for the freelancer to confirm receipt</li>
                <li>Review the deliverables when ready</li>
                <li>Mark project as complete or request revisions</li>
              </ol>
            </div>
          )}

          {/* EMPLOYER LEFT: QR Code Payment */}
          {isEmployer && workspace.project.freelancer?.upiId && (
            <div style={{ padding: "16px", background: "var(--card-bg)", borderRadius: "16px", border: "1px solid var(--card-border)", textAlign: "center" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)", marginBottom: "12px", opacity: 0.7, letterSpacing: "0.05em", textTransform: "uppercase" }}>QR Code Payment</p>
              <div style={{ background: "white", borderRadius: "12px", padding: "10px", display: "inline-block", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: "12px" }}>
                <img
                  src={workspace.project.freelancer.upiQrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=${encodeURIComponent(workspace.project.freelancer.upiId)}`}
                  alt="UPI QR Code"
                  style={{ width: "140px", height: "140px", objectFit: "contain", borderRadius: "8px", display: "block" }}
                />
              </div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--foreground)", opacity: 0.5, marginBottom: "4px", letterSpacing: "0.06em" }}>UPI ID</p>
              <p style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, color: "var(--foreground)", background: "var(--background)", padding: "6px 12px", borderRadius: "8px", marginBottom: "8px" }}>{workspace.project.freelancer.upiId}</p>
              <p style={{ fontSize: "11px", color: "var(--foreground)", opacity: 0.55, lineHeight: 1.5 }}>Please make the payment using this QR code.</p>
            </div>
          )}

          {/* FREELANCER LEFT: Payment confirmation */}
          {isFreelancer && workspace.project.paymentStatus !== "CONFIRMED" && (
            <div style={{ padding: "16px", background: "rgba(59,130,246,0.08)", borderRadius: "14px", border: "1px solid rgba(59,130,246,0.25)", marginBottom: "16px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#1d4ed8", marginBottom: "6px" }}>Awaiting Payment</p>
              <p style={{ fontSize: "12px", color: "#1e40af", opacity: 0.8, marginBottom: "12px", lineHeight: 1.5 }}>Once the employer sends payment via UPI, confirm receipt here.</p>
              <form action={handleConfirmPayment}>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", fontSize: "13px", borderRadius: "10px" }}>Confirm Payment Received</button>
              </form>
            </div>
          )}

          {/* Delivery Actions for Employer */}
          {workspace.project.paymentStatus === "CONFIRMED" && workspace.project.status === "IN_PROGRESS" && isEmployer && (
            <div style={{ padding: "16px", background: "var(--card-bg)", borderRadius: "14px", border: "1px solid var(--card-border)", marginTop: "16px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>Project Delivery</p>
              <p style={{ fontSize: "12px", opacity: 0.6, marginBottom: "12px" }}>Review deliverables then close the project.</p>
              {workspace.project.revisionsAllowed >0 && (
                <form action={handleRequestRevision} style={{ marginBottom: "8px" }}>
                  <input type="hidden" name="description" value="General revision request" />
                  <button type="submit" className="btn btn-outline" style={{ width: "100%", fontSize: "12px", borderRadius: "10px" }}>
                    Request Revision ({workspace.project.revisionsAllowed} left)
                  </button>
                </form>
              )}
              <form action={handleCompleteProject}>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", fontSize: "13px", borderRadius: "10px" }}>Mark as Completed</button>
              </form>
            </div>
          )}

          {/* Review Section */}
          {workspace.project.status === "COMPLETED" && !hasReviewed && (
            <div style={{ padding: "16px", background: "rgba(16,185,129,0.07)", borderRadius: "14px", border: "1px solid rgba(16,185,129,0.25)", marginTop: "16px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#065f46", marginBottom: "12px" }}>Leave a Review</p>
              <form action={handleSubmitReview} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input type="number" name="rating" min="1" max="5" defaultValue="5" required
                  style={{ padding: "8px 12px", border: "1px solid var(--card-border)", borderRadius: "10px", textAlign: "center", fontWeight: 700, background: "var(--card-bg)", color: "var(--foreground)", width: "100%" }} />
                <textarea name="text" placeholder="Share your experience..." rows={3}
                  style={{ padding: "8px 12px", border: "1px solid var(--card-border)", borderRadius: "10px", background: "var(--card-bg)", color: "var(--foreground)", fontFamily: "inherit", resize: "none", width: "100%" }} />
                <button type="submit" className="btn btn-primary" style={{ borderRadius: "10px", fontSize: "13px" }}>Submit Review</button>
              </form>
            </div>
          )}
        </div>

        {/* ===== CENTER PANEL — CHAT ===== */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--background)" }}>
          <WorkspaceChat workspaceId={workspaceId} currentUserId={session.userId} />
        </div>

        {/* ===== RIGHT PANEL — Project Info ===== */}
        <div className="ws-panel ws-right ws-scrollbar" style={{ padding: "24px 20px", background: "var(--card-bg)" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>Project Info</p>
          <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "14px", lineHeight: 1.3 }}>{workspace.project.title}</h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            <span className="status-badge" style={{ background: "rgba(99,102,241,0.12)", color: "var(--primary)" }}>{workspace.project.status.replace("_", " ")}</span>
            <span className="status-badge" style={{
              background: workspace.project.paymentStatus === "PENDING" ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.12)",
              color: workspace.project.paymentStatus === "PENDING" ? "#92400e" : "#065f46"
            }}>{workspace.project.paymentStatus.replace("_", " ")}</span>
          </div>

          <div style={{ padding: "12px", background: "var(--background)", borderRadius: "10px", marginBottom: "16px" }}>
            <p style={{ fontSize: "11px", opacity: 0.55, fontWeight: 600, marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Budget</p>
            <p style={{ fontSize: "14px", fontWeight: 700 }}>
              {workspace.project.budgetType} {workspace.project.paymentAmount ? `₹${workspace.project.paymentAmount}` : workspace.project.budgetMin ? `₹${workspace.project.budgetMin}` : "—"}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {!existingDispute ? (
              <form action={handleRaiseDispute}>
                <input type="hidden" name="reportedUserId" value={opponentId} />
                <input type="hidden" name="reason" value="General Report" />
                <input type="hidden" name="description" value="Report from workspace." />
                <button type="submit" style={{ width: "100%", padding: "10px 16px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#dc2626", fontWeight: 700, fontSize: "13px", background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.2)", cursor: "pointer", transition: "all 0.2s" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ width: "16px", height: "16px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Report {isEmployer ? "Freelancer" : "Employer"}
                </button>
              </form>
            ) : (
              <div style={{ padding: "10px 16px", borderRadius: "12px", textAlign: "center", background: "rgba(249,115,22,0.08)", color: "#c2410c", fontWeight: 700, fontSize: "13px", border: "1px solid rgba(249,115,22,0.2)" }}>
                Report Submitted
              </div>
            )}

            <Link
              href={`/${isEmployer ? "freelancer" : "employer"}/${opponentId}`}
              style={{ width: "100%", padding: "10px 16px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "var(--primary)", fontWeight: 700, fontSize: "13px", background: "var(--primary-light)", border: "1.5px solid var(--primary)", textDecoration: "none", transition: "all 0.2s" }}
            >
              View {isEmployer ? "freelancer" : "employer"} profile
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
