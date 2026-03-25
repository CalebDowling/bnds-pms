"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Setup2FAPage() {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "setup" | "verify">("info");
  const [qrUrl, setQrUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStartSetup() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start 2FA setup");
      setQrUrl(data.qrCodeUrl || "");
      setSecret(data.secret || "");
      setStep("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) {
      setError("Enter a 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code, secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#40721D]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#40721D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Two-Factor Authentication Required</h1>
          <p className="text-sm text-gray-500 mt-2">
            Your role requires 2FA for HIPAA compliance. Set up an authenticator app to continue.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {step === "info" && (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800 font-medium">Why is this required?</p>
              <p className="text-xs text-amber-700 mt-1">
                HIPAA and DEA regulations require strong authentication for users who access
                Protected Health Information (PHI) and controlled substance records.
              </p>
            </div>
            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="w-full py-3 bg-[#40721D] text-white font-semibold rounded-lg hover:bg-[#2D5114] transition-colors disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Set Up 2FA Now"}
            </button>
          </div>
        )}

        {step === "setup" && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            {qrUrl && (
              <div className="flex justify-center mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            )}
            {secret && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Manual entry key:</p>
                <p className="text-sm font-mono font-bold text-gray-800 break-all">{secret}</p>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter 6-digit code from your app:
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D]"
                placeholder="000000"
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full py-3 bg-[#40721D] text-white font-semibold rounded-lg hover:bg-[#2D5114] transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Enable 2FA"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
