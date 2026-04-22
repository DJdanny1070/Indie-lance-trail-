"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PostProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    requiredSkills: "",
    budgetType: "FIXED",
    budgetMin: "",
    budgetMax: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage("Project posted successfully!");
        setTimeout(() =>router.push("/dashboard"), 1500);
      } else {
        setMessage(data.error || "Failed to post project.");
      }
    } catch {
      setMessage("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Post a New Project</h1>
      
      <div className="card glass">
        {message && (
          <div className={`mb-4 p-3 rounded text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Project Title</label>
            <input 
              required
              type="text" 
              className="form-input" 
              placeholder="e.g. Build a modern React Dashboard"
              value={form.title}
              onChange={(e) =>setForm({...form, title: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Project Description</label>
            <textarea 
              required
              rows={5}
              className="form-textarea" 
              placeholder="Describe what you need done..."
              value={form.description}
              onChange={(e) =>setForm({...form, description: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Required Skills (comma separated)</label>
            <input 
              required
              type="text" 
              className="form-input" 
              placeholder="e.g. Next.js, TypeScript, TailwindCSS"
              value={form.requiredSkills}
              onChange={(e) =>setForm({...form, requiredSkills: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Budget Type</label>
            <select 
              className="form-select"
              value={form.budgetType}
              onChange={(e) =>setForm({...form, budgetType: e.target.value})}
            >
              <option value="FIXED">Fixed Price Project</option>
              <option value="HOURLY">Hourly Rate Work</option>
            </select>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 form-group">
            <div>
              <label className="form-label">Budget Min (₹)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="1000"
                value={form.budgetMin}
                onChange={(e) =>setForm({...form, budgetMin: e.target.value})}
              />
            </div>
            <div>
              <label className="form-label">Budget Max (₹)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="5000"
                value={form.budgetMax}
                onChange={(e) =>setForm({...form, budgetMax: e.target.value})}
              />
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
            {loading ? "Posting..." : "Post Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
