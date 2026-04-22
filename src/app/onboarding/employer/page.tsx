import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function EmployerOnboarding() {
  const session = await getSession();
  if (!session || session.role !== "EMPLOYER") redirect("/login");

  const handleOnboarding = async (formData: FormData) =>{
    "use server";
    const companyName = formData.get("companyName") as string;
    const website = formData.get("website") as string;
    const description = formData.get("description") as string;

    await prisma.employerProfile.update({
      where: { userId: session.userId },
      data: { companyName, website, description }
    });

    redirect("/dashboard");
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center p-4">
      <div className="card glass w-full max-w-2xl bg-white shadow-xl rounded-2xl p-8 border-t-4 border-t-purple-600">
        <h1 className="text-3xl font-bold mb-2">Complete Your Company Profile</h1>
        <p className="text-muted mb-8">Provide your details to build trust with top Indian freelancers.</p>
        
        <form action={handleOnboarding} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Company/Brand Name*</label>
              <input name="companyName" type="text" className="form-input w-full" placeholder="TechCorp Ltd." required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Website (Optional)</label>
              <input name="website" type="text" className="form-input w-full" placeholder="e.g. example.com" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Company Description*</label>
              <textarea name="description" className="form-input w-full" rows={5} placeholder="What does your company do?" required></textarea>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="btn btn-primary px-8 text-lg font-bold shadow-lg transition-transform hover:-translate-y-0.5">Save & Continue</button>
          </div>
        </form>
      </div>
    </div>
  );
}
