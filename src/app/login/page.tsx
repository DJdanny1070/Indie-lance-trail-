"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      
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
        <h2 className="text-3xl font-bold mb-6 text-center">Welcome Back</h2>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex-col gap-4">
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
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-muted">
          Don't have an account? <Link href="/register" className="font-semibold" style={{ color: "var(--primary)" }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}
