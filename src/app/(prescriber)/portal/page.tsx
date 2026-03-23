"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function PrescriberLoginPage(): React.ReactNode {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"npi" | "email">("npi");
  const [npi, setNpi] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/prescriber-portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npi, lastName }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }
      localStorage.setItem("prescriber_token", data.token);
      localStorage.setItem("prescriber_name", data.prescriber.firstName);
      router.push("/portal/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message || "Login failed. Please try again.");
        return;
      }
      if (!data.user) {
        setError("Login failed. Please try again.");
        return;
      }
      const prescriberName =
        data.user.user_metadata?.prescriber_name ||
        data.user.user_metadata?.firstName ||
        email.split("@")[0];
      localStorage.setItem("prescriber_name", prescriberName);
      router.push("/portal/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes scaleIn {
              from { opacity: 0; transform: scale(0.9); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-6px); }
            }
            .login-card {
              animation: fadeUp 0.5s ease-out both;
            }
            .login-logo {
              animation: scaleIn 0.4s ease-out both;
            }
            .login-title {
              animation: fadeUp 0.5s ease-out 0.1s both;
            }
            .login-subtitle {
              animation: fadeUp 0.5s ease-out 0.15s both;
            }
            .login-form {
              animation: fadeUp 0.5s ease-out 0.25s both;
            }
            .login-footer {
              animation: fadeUp 0.5s ease-out 0.35s both;
            }
            .btn-shine {
              position: relative;
              overflow: hidden;
            }
            .btn-shine::after {
              content: '';
              position: absolute;
              top: 0; left: -100%;
              width: 100%; height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
              transition: left 0.5s;
            }
            .btn-shine:hover::after {
              left: 100%;
            }
            .tab-indicator {
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
          `,
        }}
      />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f4ec] via-[#f8f9fb] to-[#eef2e8] px-4">
        {/* Decorative background circles */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#40721D]/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#40721D]/3 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-[420px] relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="login-logo inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#40721D] to-[#5a9e2e] rounded-2xl mb-5 shadow-lg shadow-[#40721D]/20">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <h1 className="login-title text-2xl font-bold text-gray-900 tracking-tight">
              Boudreaux&apos;s New Drug Store
            </h1>
            <p className="login-subtitle text-[13px] text-gray-500 mt-1.5">
              Prescriber Portal — Powered by <span className="font-semibold text-gray-600">DRX</span>
            </p>
          </div>

          {/* Card */}
          <div className="login-card bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="relative flex border-b border-gray-100">
              <button
                onClick={() => { setActiveTab("npi"); setError(""); }}
                className={`flex-1 py-3.5 px-4 text-[13px] font-medium transition-colors relative z-10 ${
                  activeTab === "npi" ? "text-[#40721D]" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                NPI Login
              </button>
              <button
                onClick={() => { setActiveTab("email"); setError(""); }}
                className={`flex-1 py-3.5 px-4 text-[13px] font-medium transition-colors relative z-10 ${
                  activeTab === "email" ? "text-[#40721D]" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Email Login
              </button>
              {/* Animated underline */}
              <div
                className="tab-indicator absolute bottom-0 h-[2px] bg-[#40721D] rounded-full"
                style={{
                  width: "50%",
                  left: activeTab === "npi" ? "0%" : "50%",
                }}
              />
            </div>

            <div className="p-7">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-[12.5px] text-gray-400 mb-6">
                {activeTab === "npi"
                  ? "Sign in with your NPI number and last name"
                  : "Sign in with your email and password"}
              </p>

              {error && (
                <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl animate-[fadeUp_0.3s_ease-out]">
                  <p className="text-[12.5px] text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* NPI Form */}
              {activeTab === "npi" && (
                <form onSubmit={handleNpiSubmit} className="login-form space-y-4">
                  <div>
                    <label htmlFor="npi" className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      NPI Number
                    </label>
                    <input
                      id="npi"
                      type="text"
                      value={npi}
                      onChange={(e) => setNpi(e.target.value)}
                      placeholder="e.g., 1234567890"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-300 focus:bg-white focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Your last name"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-300 focus:bg-white focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all duration-200"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-shine w-full py-3 px-4 bg-[#40721D] text-white text-[13.5px] font-semibold rounded-xl hover:bg-[#355f1a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-2 shadow-sm shadow-[#40721D]/20 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>
              )}

              {/* Email Form */}
              {activeTab === "email" && (
                <form onSubmit={handleEmailSubmit} className="login-form space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-300 focus:bg-white focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-300 focus:bg-white focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all duration-200"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-shine w-full py-3 px-4 bg-[#40721D] text-white text-[13.5px] font-semibold rounded-xl hover:bg-[#355f1a] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-2 shadow-sm shadow-[#40721D]/20 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>
              )}

              {/* Register */}
              <div className="mt-6 text-center">
                <p className="text-[12.5px] text-gray-400">
                  New prescriber?{" "}
                  <Link href="/portal/register" className="text-[#40721D] font-semibold hover:underline">
                    Create an account
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="login-footer mt-8 text-center">
            <p className="text-[11px] text-gray-400">
              Boudreaux&apos;s New Drug Store Pharmacy — Compounding Services
            </p>
            <p className="text-[11px] text-gray-300 mt-1">(337) 233-8468</p>
          </div>
        </div>
      </div>
    </>
  );
}
