import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function FreelancerOnboarding() {
  const session = await getSession();
  if (!session || session.role !== "FREELANCER") redirect("/login");

  const handleOnboarding = async (formData: FormData) =>{
    "use server";
    const skills = formData.get("skills") as string;
    const hourlyRate = parseFloat(formData.get("hourlyRate") as string) || 0;
    const bio = formData.get("bio") as string;
    const availability = formData.get("availability") as string;
    const portfolioUrl = formData.get("portfolioUrl") as string;
    const upiId = formData.get("upiId") as string;
    const upiQrCodeUrl = formData.get("upiQrCodeUrl") as string;

    await prisma.freelancerProfile.update({
      where: { userId: session.userId },
      data: { skills, hourlyRate, bio, availability, portfolioUrl, upiId, upiQrCodeUrl }
    });

    redirect("/dashboard");
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center p-4">
      <div className="card glass w-full max-w-2xl bg-white shadow-xl rounded-2xl p-8 border-t-4 border-t-blue-600">
        <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
        <p className="text-muted mb-8">Tell us more about yourself to help clients find you and process payments securely.</p>
        
        <form action={handleOnboarding} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-1">Skills (comma separated)*</label>
              <input name="skills" type="text" className="form-input w-full" placeholder="React, Node.js, UI Design" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Hourly Rate (₹)*</label>
              <input name="hourlyRate" type="number" step="0.01" className="form-input w-full" placeholder="500" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Availability</label>
              <select name="availability" className="form-input w-full">
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="UNAVAILABLE">Currently Unavailable</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Portfolio/Website Link</label>
              <input name="portfolioUrl" type="url" className="form-input w-full" placeholder="https://..." />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Professional Bio*</label>
            <textarea name="bio" className="form-input w-full" rows={4} placeholder="Describe your experience and what makes you great..." required></textarea>
          </div>

          <div className="border-t pt-6 mt-6">
            <h3 className="font-bold text-lg mb-4">
              Payment Setup (UPI)
            </h3>
            <p className="text-sm text-gray-500 mb-4">Set up your UPI details so employers can pay you directly. This information will be shared inside active project workspaces.</p>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Your UPI ID*</label>
                <input name="upiId" type="text" className="form-input w-full" placeholder="username@bank" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">UPI QR Code URL (Optional)</label>
                <input name="upiQrCodeUrl" type="url" className="form-input w-full" placeholder="https://link-to-your-qr-image.png" />
                <p className="text-xs text-muted mt-1">Provide a direct link to an image of your QR code if you have one.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="btn btn-primary px-8 text-lg font-bold shadow-lg transition-transform hover:-translate-y-0.5">Save Profile & Continue</button>
          </div>
        </form>
      </div>
    </div>
  );
}
