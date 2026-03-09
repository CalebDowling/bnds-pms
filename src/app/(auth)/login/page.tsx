"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      var res = await fetch("https://vmtloffiiejuqzqemawb.supabase.co/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdGxvZmZpaWVqdXF6cWVtYXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTc1OTIsImV4cCI6MjA4ODIzMzU5Mn0.4DLR-QNNUs1Mp6kXeri_plsF1NoaaCvF0Gf-WcFp86Y"
        },
        body: JSON.stringify({ email: email, password: password })
      });
      var data = await res.json();
      if (data.error) {
        setError("Auth error: " + data.error_description);
        setLoading(false);
        return;
      }
      if (data.access_token) {
        document.cookie = "sb-vmtloffiiejuqzqemawb-auth-token.0=" + data.access_token + ";path=/;max-age=31536000";
        document.cookie = "sb-vmtloffiiejuqzqemawb-auth-token.1=" + data.refresh_token + ";path=/;max-age=31536000";
        setError("SUCCESS! Redirecting...");
        setTimeout(function() { window.location.href = "/dashboard"; }, 1000);
      } else {
        setError("No token: " + JSON.stringify(data));
      }
    } catch (err) {
      setError("Fetch error: " + err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#1B4F72] mb-4">
            <span className="text-2xl font-bold text-white">B</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">BNDS Pharmacy</h1>
          <p className="text-gray-500 mt-1">Pharmacy Management System</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={function(e) { setEmail(e.target.value); }} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="you@bndsrx.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={function(e) { setPassword(e.target.value); }} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="********" />
            </div>
            {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200">{error}</div>}
            <button type="submit" disabled={loading} className="w-full py-2.5 px-4 bg-[#1B4F72] text-white text-sm font-medium rounded-lg hover:bg-[#154360] disabled:opacity-50">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}