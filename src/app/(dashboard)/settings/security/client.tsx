"use client";

import React, { useEffect, useState } from "react";
import { generateQRCodeURL } from "@/lib/security/totp";

export const dynamic = "force-dynamic";

type Step = "idle" | "generating" | "qrcode" | "verify" | "success" | "disable";

interface SecuritySettingsPageProps {
  initialIs2FAEnabled: boolean;
}

export function SecuritySettingsPage({
  initialIs2FAEnabled,
}: SecuritySettingsPageProps) {
  const [step, setStep] = useState<Step>("idle");
  const [is2FAEnabled, setIs2FAEnabled] = useState(initialIs2FAEnabled);
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // Get user email on mount
  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setUserEmail(data.email);
        }
      } catch (error) {
        console.error("Failed to get user email:", error);
      }
    };

    getUserEmail();
  }, []);

  const handleSetup2FA = async () => {
    try {
      setStep("generating");
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });

      if (!res.ok) {
        throw new Error("Failed to setup 2FA");
      }

      const { secret: newSecret } = await res.json();
      setSecret(newSecret);

      // Generate QR code URL
      const qrUrl = generateQRCodeURL(
        newSecret,
        userEmail || "user@example.com",
        "Boudreaux's Pharmacy"
      );
      setQrCodeUrl(qrUrl);

      setStep("qrcode");
    } catch (error) {
      console.error("Failed to setup 2FA:", error);
      console.log("Failed to setup 2FA");
      setStep("idle");
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      console.log("Please enter a 6-digit code");
      return;
    }

    try {
      setVerifying(true);
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: verificationCode }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Verification failed");
      }

      const result = await res.json();
      setRecoveryCodes(result.recoveryCodes);
      setStep("success");
      setIs2FAEnabled(true);
      console.log("2FA enabled successfully!");
      setVerificationCode("");
    } catch (error) {
      console.error("Verification failed:", error);
      console.log(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) {
      console.log("Please enter a 6-digit code");
      return;
    }

    try {
      setDisabling(true);
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", token: disableCode }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Disable failed");
      }

      setIs2FAEnabled(false);
      setStep("idle");
      console.log("2FA disabled successfully!");
      setDisableCode("");
    } catch (error) {
      console.error("Disable failed:", error);
      console.log(error instanceof Error ? error.message : "Disable failed");
    } finally {
      setDisabling(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    try {
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recovery_codes" }),
      });

      if (!res.ok) {
        throw new Error("Failed to regenerate codes");
      }

      const { recoveryCodes: newCodes } = await res.json();
      setRecoveryCodes(newCodes);
      setShowRecoveryCodes(true);
      console.log("Recovery codes regenerated");
    } catch (error) {
      console.error("Failed to regenerate codes:", error);
      console.log("Failed to regenerate recovery codes");
    }
  };

  const downloadRecoveryCodes = () => {
    const text = [
      "Boudreaux's Pharmacy - Recovery Codes",
      "Save these codes in a secure location. Each code can be used once.",
      "Generated: " + new Date().toLocaleString(),
      "",
      ...recoveryCodes,
    ].join("\n");

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(text)
    );
    element.setAttribute("download", "recovery-codes.txt");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    console.log("Recovery codes downloaded");
  };


  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Security Settings</h1>

      {/* Two-Factor Authentication Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Two-Factor Authentication (2FA)
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Add an extra layer of security to your account
        </p>

        <div className="mt-6 space-y-4">
          {is2FAEnabled ? (
            <>
              <div className="flex items-center gap-3 rounded-md bg-green-50 p-4">
                <div className="h-2 w-2 rounded-full bg-green-600" />
                <div>
                  <p className="font-medium text-green-900">
                    2FA is enabled
                  </p>
                  <p className="text-sm text-green-700">
                    Your account is protected with two-factor authentication
                  </p>
                </div>
              </div>

              {step !== "disable" && (
                <button
                  onClick={() => setStep("disable")}
                  className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Disable 2FA
                </button>
              )}

              {step === "disable" && (
                <div className="mt-4 space-y-3 rounded-md bg-gray-50 p-4">
                  <label className="block text-sm font-medium text-gray-900">
                    Enter your 2FA code to disable:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-2xl font-mono tracking-widest focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDisable2FA}
                      disabled={disabling || disableCode.length !== 6}
                      className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      {disabling ? "Disabling..." : "Confirm Disable"}
                    </button>
                    <button
                      onClick={() => {
                        setStep("idle");
                        setDisableCode("");
                      }}
                      className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {step !== "disable" && (
                <button
                  onClick={handleRegenerateRecoveryCodes}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Regenerate Recovery Codes
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                2FA is not enabled on your account. Click below to enable it.
              </p>

              {step === "idle" && (
                <button
                  onClick={handleSetup2FA}
                  className="mt-4 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Enable 2FA
                </button>
              )}

              {step === "generating" && (
                <div className="text-center text-sm text-gray-600">
                  Generating QR code...
                </div>
              )}

              {step === "qrcode" && (
                <div className="mt-4 space-y-4 rounded-md bg-blue-50 p-4">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Step 1: Scan QR Code
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Use an authenticator app (Google Authenticator, Microsoft
                      Authenticator, Authy, etc.) to scan this QR code:
                    </p>
                    <div className="mt-3 flex justify-center">
                      <img src={qrCodeUrl} alt="QR Code" className="h-48 w-48" />
                    </div>
                    <p className="mt-3 text-sm text-gray-600">
                      Or enter this code manually:
                    </p>
                    <p className="mt-1 break-all rounded-md bg-white p-2 font-mono text-sm font-semibold text-gray-900">
                      {secret}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900">
                      Step 2: Enter Verification Code
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Enter the 6-digit code from your authenticator app:
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="000000"
                      className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-2xl font-mono tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleVerify2FA}
                    disabled={verifying || verificationCode.length !== 6}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {verifying ? "Verifying..." : "Verify & Enable 2FA"}
                  </button>
                </div>
              )}

              {step === "success" && (
                <div className="mt-4 space-y-4 rounded-md bg-green-50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-green-600" />
                    <h3 className="font-medium text-green-900">
                      2FA Enabled Successfully!
                    </h3>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      Recovery Codes
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">
                      Save these codes in a secure location. You can use them if
                      you lose access to your authenticator app.
                    </p>

                    <div className="mt-3 max-h-40 overflow-y-auto rounded-md bg-white p-3 font-mono text-sm">
                      {recoveryCodes.map((code, idx) => (
                        <div key={idx} className="text-gray-900">
                          {code}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={downloadRecoveryCodes}
                        className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Download Codes
                      </button>
                      <button
                        onClick={() => setShowRecoveryCodes(!showRecoveryCodes)}
                        className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* IP Allowlist Notice */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          IP Allowlist (Admin Only)
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage IP allowlist for admin access in the Compliance section
        </p>
        <a
          href="/compliance/ip-allowlist"
          className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          Go to IP Allowlist Settings →
        </a>
      </div>
    </div>
  );
}
