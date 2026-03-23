"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PrescriberRegisterPage(): React.ReactNode {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [npi, setNpi] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";

    if (!npi.trim()) {
      errors.npi = "NPI is required";
    } else if (!/^\d{10}$/.test(npi)) {
      errors.npi = "NPI must be exactly 10 digits";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (!practiceName.trim()) errors.practiceName = "Practice name is required";
    if (!phone.trim()) errors.phone = "Phone number is required";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/prescriber-portal/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          npi: npi.trim(),
          email: email.trim().toLowerCase(),
          password,
          practiceName: practiceName.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      setSuccess(true);

      // Reset form
      setFirstName("");
      setLastName("");
      setNpi("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPracticeName("");
      setPhone("");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/portal?registered=true");
      }, 2000);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-[#40721D]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Registration Successful!
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Your account has been created. Redirecting to login...
            </p>
            <Link
              href="/portal"
              className="inline-block text-[#40721D] font-medium hover:underline"
            >
              Go to login now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8 py-12">
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

        {/* Registration Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Create Your Account
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition ${
                  validationErrors.firstName
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              {validationErrors.firstName && (
                <p className="text-xs text-red-600 mt-1">
                  {validationErrors.firstName}
                </p>
              )}
            </div>

            {/* Last Name */}
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
                placeholder="Smith"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition ${
                  validationErrors.lastName
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              {validationErrors.lastName && (
                <p className="text-xs text-red-600 mt-1">
                  {validationErrors.lastName}
                </p>
              )}
            </div>

            {/* NPI */}
            <div>
              <label
                htmlFor="npi"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                NPI Number (10 digits)
              </label>
              <input
                id="npi"
                type="text"
                value={npi}
                onChange={(e) => setNpi(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="1234567890"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition ${
                  validationErrors.npi ? "border-red-300" : "border-gray-300"
                }`}
              />
              {validationErrors.npi && (
                <p className="text-xs text-red-600 mt-1">
                  {validationErrors.npi}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition ${
                  validationErrors.email ? "border-red-300" : "border-gray-300"
                }`}
              />
              {validationErrors.email && (
                <p className="text-xs text-red-600 mt-1">
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition ${
                  validationErrors.password
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              {validationErrors.password && (
                <p className="text-xs text-red-600 mt-1">
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition ${
                  validationErrors.confirmPassword
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              {validationErrors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Practice Name */}
            <div>
              <label
                htmlFor="practiceName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Practice Name
              </label>
              <input
                id="practiceName"
                type="text"
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                placeholder="Your practice name"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition ${
                  validationErrors.practiceName
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              {validationErrors.practiceName && (
                <p className="text-xs text-red-600 mt-1">
                  {validationErrors.practiceName}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition ${
                  validationErrors.phone ? "border-red-300" : "border-gray-300"
                }`}
              />
              {validationErrors.phone && (
                <p className="text-xs text-red-600 mt-1">
                  {validationErrors.phone}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
            >
              {isLoading ? "Creating Account..." : "Register"}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/portal"
                className="text-[#40721D] font-medium hover:underline"
              >
                Sign in here
              </Link>
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
