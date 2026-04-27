"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronRight, Shield } from "lucide-react";

/**
 * BNDS PMS Redesign — Login (Variation A: split panel, heritage warm)
 * Paper background, full-color logo, forest serif headline, paper-2 brand panel.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
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
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full grid"
      style={{
        gridTemplateColumns: "1.1fr 1fr",
        backgroundColor: "#faf8f4",
      }}
    >
      {/* ── Brand panel (left) ── */}
      <div
        className="hidden md:flex flex-col justify-between relative overflow-hidden"
        style={{
          backgroundColor: "#f4ede0",
          padding: "48px 56px",
          borderRight: "1px solid #e3ddd1",
        }}
      >
        {/* Botanical wash */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 80% 10%, rgba(90,168,69,0.10), transparent 55%), radial-gradient(circle at 15% 90%, rgba(31,90,58,0.06), transparent 50%)",
          }}
        />
        <div className="relative z-10">
          <img src="/logo.webp" alt="Boudreaux's" style={{ height: 64 }} />
        </div>
        <div className="relative z-10">
          <div
            className="text-[11px] font-semibold uppercase"
            style={{ color: "#7a8a78", letterSpacing: "0.14em" }}
          >
            Pharmacy Management System
          </div>
          <h1
            style={{
              fontFamily:
                "var(--font-serif), 'Source Serif 4', Georgia, serif",
              fontSize: 44,
              lineHeight: 1.05,
              fontWeight: 500,
              color: "#0f2e1f",
              marginTop: 14,
              letterSpacing: "-0.02em",
            }}
          >
            A century of care,
            <br />
            now in your hands.
          </h1>
          <p
            style={{
              marginTop: 18,
              color: "#3a4a3c",
              fontSize: 15,
              maxWidth: 380,
              lineHeight: 1.55,
            }}
          >
            Sign in to manage prescriptions, patients, and inventory across all
            Boudreaux&apos;s locations.
          </p>
        </div>
        <div
          className="relative z-10 flex items-center gap-5"
          style={{ color: "#7a8a78", fontSize: 12 }}
        >
          <span>Est. 1923</span>
          <span
            style={{
              width: 3,
              height: 3,
              backgroundColor: "#a3a89c",
              borderRadius: 999,
            }}
          />
          <span>HIPAA compliant</span>
          <span
            style={{
              width: 3,
              height: 3,
              backgroundColor: "#a3a89c",
              borderRadius: 999,
            }}
          />
          <span>v4.2.1</span>
        </div>
      </div>

      {/* ── Form panel (right) ── */}
      <div
        className="flex flex-col justify-center"
        style={{ padding: "48px 56px", maxWidth: 520, width: "100%" }}
      >
        <div className="md:hidden mb-6">
          <img src="/logo.webp" alt="Boudreaux's" style={{ height: 48 }} />
        </div>
        <div
          className="text-[11px] font-semibold uppercase"
          style={{ color: "#7a8a78", letterSpacing: "0.14em" }}
        >
          Sign in
        </div>
        <h2
          style={{
            fontFamily: "var(--font-serif), 'Source Serif 4', Georgia, serif",
            fontSize: 32,
            marginTop: 8,
            fontWeight: 500,
            color: "#0f2e1f",
            letterSpacing: "-0.01em",
          }}
        >
          Welcome back.
        </h2>
        <p style={{ color: "#5a6b58", marginTop: 4, fontSize: 14 }}>
          Enter your credentials to continue.
        </p>

        <form onSubmit={handleLogin} className="mt-7 flex flex-col gap-3.5">
          <div>
            <label
              className="block text-[11px] font-semibold uppercase mb-1.5"
              style={{ color: "#7a8a78", letterSpacing: "0.10em" }}
            >
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@bndsrx.com"
              className="w-full"
              style={{
                padding: "10px 13px",
                border: "1px solid #d9d2c2",
                borderRadius: 6,
                fontSize: 14,
                backgroundColor: "#ffffff",
                color: "#0f2e1f",
                outline: "none",
                fontFamily:
                  "var(--font-inter), 'Inter Tight', Inter, system-ui, sans-serif",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#1f5a3a";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(31,90,58,0.10)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#d9d2c2";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <label
                className="text-[11px] font-semibold uppercase"
                style={{ color: "#7a8a78", letterSpacing: "0.10em" }}
              >
                Password
              </label>
              <a
                href="#"
                style={{
                  fontSize: 12,
                  color: "#1f5a3a",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Forgot?
              </a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full"
              style={{
                padding: "10px 13px",
                border: "1px solid #d9d2c2",
                borderRadius: 6,
                fontSize: 14,
                backgroundColor: "#ffffff",
                color: "#0f2e1f",
                outline: "none",
                fontFamily:
                  "var(--font-inter), 'Inter Tight', Inter, system-ui, sans-serif",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#1f5a3a";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(31,90,58,0.10)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#d9d2c2";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
          <label
            className="flex items-center gap-2 mt-1"
            style={{ fontSize: 13, color: "#3a4a3c" }}
          >
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              style={{ accentColor: "#1f5a3a" }}
            />
            Keep me signed in on this workstation
          </label>

          {error && (
            <div
              className="rounded-md"
              style={{
                backgroundColor: "rgba(184, 58, 47, 0.08)",
                color: "#9a2c1f",
                fontSize: 13,
                padding: "10px 12px",
                border: "1px solid rgba(184, 58, 47, 0.24)",
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors mt-2"
            style={{
              backgroundColor: "#1f5a3a",
              color: "#ffffff",
              border: "1px solid #1f5a3a",
              padding: "12px 18px",
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "#174530";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "#1f5a3a";
              }
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
            {!loading && <ChevronRight size={16} strokeWidth={2} />}
          </button>
        </form>

        <div
          className="mt-7 pt-4 flex items-center gap-2"
          style={{
            borderTop: "1px solid #e3ddd1",
            color: "#7a8a78",
            fontSize: 12,
          }}
        >
          <Shield size={14} strokeWidth={2} />
          Protected workstation · SSO available for staff
        </div>
      </div>
    </div>
  );
}
