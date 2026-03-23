"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PatientLoginPage(): React.ReactNode {
  const router = useRouter();
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/patient-portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastName, dateOfBirth }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      // Store token and patient info
      localStorage.setItem("patient_token", data.token);
      localStorage.setItem("patient_name", data.patient.firstName);

      // Redirect to dashboard
      router.push("/patient/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#40721D] to-[#2D5114] rounded-2xl mb-4">
            <img src="/logo.webp" alt="Boudreaux's Pharmacy" className="h-10 w-10 invert" />
          </div>
          <p className="text-xs text-gray-500 tracking-widest uppercase font-semibold mb-2">Patient Portal</p>
          <h1 className="text-3xl font-bold text-gray-900">
            Boudreaux's Pharmacy
          </h1>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-900/5 p-8 sm:p-10 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Welcome Back
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Last Name Field */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Your last name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:border-[#40721d] focus:ring-[#40721d]/20 focus:ring-2 outline-none transition-all bg-white/50 backdrop-blur-sm hover:bg-white/75"
                required
              />
            </div>

            {/* Date of Birth Field */}
            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:border-[#40721d] focus:ring-[#40721d]/20 focus:ring-2 outline-none transition-all bg-white/50 backdrop-blur-sm hover:bg-white/75"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#40721d] to-[#5a9f2a] text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-[#40721D]/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all duration-200 mt-8"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Signing In...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50/50 border border-blue-200 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1h2v2H7V4zm2 4H7v2h2V8zm2-4h2v2h-2V4zm2 4h-2v2h2V8z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">
              Use your last name and date of birth to log in. If you don't have access, please contact the pharmacy directly at (555) 123-4567.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-600">
          <p className="font-semibold">Boudreaux's New Drug Store Pharmacy</p>
          <p className="mt-1 text-gray-500">Compounding Pharmacy Services</p>
        </div>
      </div>
    </div>
  );
}
