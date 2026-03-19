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
          <img src="/logo.webp" alt="Boudreaux's Pharmacy" className="h-[60px] mx-auto mb-4" />
          <p className="text-sm text-gray-500 tracking-wide mb-2">Patient Portal</p>
          <h1 className="text-2xl font-bold text-gray-900">
            Boudreaux's Pharmacy
          </h1>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Sign In
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Last Name Field */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Your last name"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#40721d] focus:ring-[#40721d]/10 focus:ring-2 outline-none transition-all"
                required
              />
            </div>

            {/* Date of Birth Field */}
            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#40721d] focus:ring-[#40721d]/10 focus:ring-2 outline-none transition-all"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#40721d] to-[#5a9f2a] text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-green-200/40 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-200 mt-6"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs text-blue-700 leading-relaxed">
              Use your last name and date of birth to log in. If you don't have
              access, please contact the pharmacy directly at (555) 123-4567.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-600">
          <p className="font-medium">Boudreaux's New Drug Store Pharmacy</p>
          <p className="mt-1 text-gray-500">Compounding Pharmacy Services</p>
        </div>
      </div>
    </div>
  );
}
