"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Use window.location for a full page navigation so cookies are sent fresh
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <img src="/logo.webp" alt="Boudreaux's New Drug Store" className="h-[60px] mx-auto mb-4" />
            <p className="text-sm text-gray-500 tracking-wide mb-4">Pharmacy Management System</p>
            <h2 className="text-xl font-bold text-gray-900">Sign in to your account</h2>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#40721d] focus:ring-[#40721d]/10 focus:ring-2 outline-none transition-all"
                placeholder="you@bndsrx.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#40721d] focus:ring-[#40721d]/10 focus:ring-2 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#40721d] to-[#5a9f2a] text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-green-200/40 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-8">Boudreaux's New Drug Store</p>
        </div>
      </div>
    </div>
  );
}
