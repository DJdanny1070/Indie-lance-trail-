"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "FREELANCER"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }
      
      router.push(data.redirect || "/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-20 flex justify-center">
      <div className="card glass max-w-md w-full animate-fade-in">
        <h2 className="text-3xl font-bold mb-6 text-center">Create Account</h2>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label">I am a...</label>
            <select 
              className="form-select"
              value={form.role}
              onChange={(e) =>setForm({...form, role: e.target.value})}
            >
              <option value="FREELANCER">Freelancer (looking for work)</option>
              <option value="EMPLOYER">Employer (hiring talent)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              required 
              type="text" 
              className="form-input" 
              value={form.name}
              onChange={(e) =>setForm({...form, name: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              required 
              type="email" 
              className="form-input"
              value={form.email}
              onChange={(e) =>setForm({...form, email: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              required 
              type="password" 
              className="form-input"
              value={form.password}
              onChange={(e) =>setForm({...form, password: e.target.value})}
            />
          </div>
          
          <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-muted">
          Already have an account? <Link href="/login" className="font-semibold" style={{ color: "var(--primary)" }}>Log in</Link>
        </div>
      </div>
    </div>
  );
}
