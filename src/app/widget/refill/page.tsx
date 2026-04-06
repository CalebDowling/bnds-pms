"use client";

import { useState, FormEvent } from "react";

/**
 * Standalone Refill Widget Page
 *
 * Embeddable via iframe. No sidebar/header — clean minimal design.
 * Reads config from URL params: ?key=<apiKey>&pharmacy=<name>&phone=<number>&color=<hex>
 */

type WidgetState = "form" | "loading" | "success" | "error";

export default function RefillWidgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // NOTE: In Next.js 16, searchParams is async in server components but
  // this is a client component, so we read from window.location directly.
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const apiKey = params.get("key") ?? "";
  const pharmacyName = params.get("pharmacy") ?? "Your Pharmacy";
  const pharmacyPhone = params.get("phone") ?? "";
  const accentColor = params.get("color") ?? "2563eb";

  const [state, setState] = useState<WidgetState>("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [rxNumber, setRxNumber] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/widget/refill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Widget-Key": apiKey,
        },
        body: JSON.stringify({
          patientLastName: lastName,
          patientDOB: dob,
          rxNumber,
          patientPhone: phone || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage(
          data.message ??
            "Your refill has been submitted! You'll receive a text when it's ready."
        );
        setState("success");
      } else {
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setErrorMessage("Unable to connect. Please try again later.");
      setState("error");
    }
  }

  const accent = `#${accentColor}`;

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: 420,
        margin: "0 auto",
        padding: "24px 16px",
        color: "#1f2937",
      }}
    >
      {/* Pharmacy branding */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: accent,
            margin: "0 auto 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          Rx
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
          {pharmacyName}
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
          Request a Prescription Refill
        </p>
      </div>

      {/* Success state */}
      {state === "success" && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #6ee7b7",
            borderRadius: 8,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#10003;</div>
          <p style={{ fontSize: 15, fontWeight: 500, color: "#065f46" }}>
            {successMessage}
          </p>
          {pharmacyPhone && (
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 12 }}>
              Questions? Call us at{" "}
              <a href={`tel:${pharmacyPhone}`} style={{ color: accent }}>
                {pharmacyPhone}
              </a>
            </p>
          )}
          <button
            onClick={() => {
              setState("form");
              setLastName("");
              setDob("");
              setRxNumber("");
              setPhone("");
            }}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              fontSize: 13,
              background: "transparent",
              border: `1px solid ${accent}`,
              color: accent,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Submit Another Refill
          </button>
        </div>
      )}

      {/* Form + error states */}
      {(state === "form" || state === "loading" || state === "error") && (
        <form onSubmit={handleSubmit}>
          {state === "error" && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 16,
                fontSize: 14,
                color: "#991b1b",
              }}
            >
              {errorMessage}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
                color: "#374151",
              }}
            >
              Last Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 15,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
                color: "#374151",
              }}
            >
              Date of Birth <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 15,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
                color: "#374151",
              }}
            >
              RX Number <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={rxNumber}
              onChange={(e) => setRxNumber(e.target.value)}
              placeholder="RX-12345"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 15,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
                color: "#374151",
              }}
            >
              Phone Number{" "}
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                (optional, for text updates)
              </span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 15,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={state === "loading"}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              background: state === "loading" ? "#9ca3af" : accent,
              border: "none",
              borderRadius: 8,
              cursor: state === "loading" ? "not-allowed" : "pointer",
              transition: "background 150ms",
            }}
          >
            {state === "loading" ? "Submitting..." : "Request Refill"}
          </button>

          <p
            style={{
              fontSize: 11,
              color: "#9ca3af",
              textAlign: "center",
              marginTop: 16,
              lineHeight: 1.5,
            }}
          >
            By submitting, you confirm you are the patient or authorized
            representative. Your information is transmitted securely.
          </p>
        </form>
      )}
    </div>
  );
}
