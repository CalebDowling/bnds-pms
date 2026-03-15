"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PrescriberLoginPage(): React.ReactNode {
  const router = useRouter();
  const [npi, setNpi] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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

      // Store token and prescriber info
      localStorage.setItem("prescriber_token", data.token);
      localStorage.setItem("prescriber_name", data.prescriber.firstName);

      // Redirect to orders page
      router.push("/portal/orders");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#40721D] rounded-full mb-4">
            <span className="text-white text-3xl font-bold">B</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Boudreaux's Pharmacy
          </h1>
          <p className="text-gray-600 mt-2">Prescriber Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Sign In
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NPI Field */}
            <div>
              <label
                htmlFor="npi"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                NPI Number
              </label>
              <input
                id="npi"
                type="text"
                value={npi}
                onChange={(e) => setNpi(e.target.value)}
                placeholder="e.g., 1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition"
                required
              />
            </div>

            {/* Last Name Field */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Your last name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              Use your NPI number and last name to log in. If you don't have
              access, please contact the pharmacy directly.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-600">
          <p>Boudreaux's New Drug Store Pharmacy</p>
          <p className="mt-1">Compounding Pharmacy Services</p>
        </div>
      </div>
    </div>
  );
}
