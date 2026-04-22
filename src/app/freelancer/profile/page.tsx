"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FreelancerProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    skills: "",
    hourlyRate: "",
    bio: "",
    availability: "PART_TIME",
    portfolioUrl: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() =>{
    fetch("/api/freelancer/profile")
      .then(res =>res.json())
      .then(data =>{
        if (data.profile) {
          setForm({
            ...data.profile,
            hourlyRate: data.profile.hourlyRate || ""
          });
        }
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setMessage("Saving...");
    try {
      const res = await fetch("/api/freelancer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setMessage("Profile updated successfully!");
        setTimeout(() =>router.push("/dashboard"), 1500);
      } else {
        setMessage("Failed to update profile.");
      }
    } catch {
      setMessage("An error occurred.");
    }
  };

  if (loading) return <div className="container py-20 text-center">Loading...</div>;

  return (
    <div className="container py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Build Your Profile</h1>
      
      <div className="card glass">
        {message && (
          <div className="mb-4 p-3 rounded bg-blue-50 text-blue-700 text-sm">
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Professional Bio</label>
            <textarea 
              rows={4}
              className="form-textarea" 
              placeholder="Tell clients about your experience and expertise..."
              value={form.bio || ""}
              onChange={(e) =>setForm({...form, bio: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Key Skills (comma separated)</label>
            <input 
              required 
              type="text" 
              className="form-input" 
              placeholder="e.g. React, Next.js, UI/UX Design"
              value={form.skills || ""}
              onChange={(e) =>setForm({...form, skills: e.target.value})}
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 form-group">
            <div>
              <label className="form-label">Hourly Rate (₹)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="500"
                value={form.hourlyRate || ""}
                onChange={(e) =>setForm({...form, hourlyRate: e.target.value})}
              />
            </div>
            <div>
              <label className="form-label">Availability</label>
              <select 
                className="form-select"
                value={form.availability || "PART_TIME"}
                onChange={(e) =>setForm({...form, availability: e.target.value})}
              >
                <option value="FULL_TIME">Full Time (40hrs/week)</option>
                <option value="PART_TIME">Part Time (&lt;20hrs/week)</option>
                <option value="UNAVAILABLE">Not Available Right Now</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Portfolio URL (Optional)</label>
            <input 
              type="url" 
              className="form-input" 
              placeholder="https://yourportfolio.com"
              value={form.portfolioUrl || ""}
              onChange={(e) =>setForm({...form, portfolioUrl: e.target.value})}
            />
          </div>
          
          <button type="submit" className="btn btn-primary mt-4">Save Profile</button>
        </form>
      </div>
    </div>
  );
}
