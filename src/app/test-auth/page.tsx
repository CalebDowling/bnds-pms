"use client";

import { useState } from "react";

export default function TestAuth() {
  const [result, setResult] = useState("");

  async function testLogin() {
    setResult("Testing...");
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          email: "cdowling@bndsrx.com",
          password: "Football12!",
        }),
      });
      const data = await res.json();
      if (data.access_token) {
        setResult("AUTH OK! Token: " + data.access_token.substring(0, 20) + "...\nSetting cookies...");
        // Set the cookie manually
        const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
        const cookieName = `sb-${projectRef}-auth-token`;
        const cookieVal = btoa(JSON.stringify([data.access_token, data.refresh_token, null, null, null]));
        document.cookie = `${cookieName}=${cookieVal};path=/;max-age=31536000;samesite=lax`;
        setResult(prev => prev + "\nCookie set: " + cookieName + "\nRedirecting in 2s...");
        setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
      } else {
        setResult("AUTH FAILED: " + JSON.stringify(data));
      }
    } catch (e: any) {
      setResult("ERROR: " + e.message);
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h1>Auth Test Page</h1>
      <button onClick={testLogin} style={{ padding: "10px 20px", fontSize: 16, cursor: "pointer" }}>
        Test Login
      </button>
      <pre style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>{result}</pre>
      <hr style={{ margin: "20px 0" }} />
      <p>Cookies: {typeof document !== "undefined" ? document.cookie || "(none)" : "SSR"}</p>
    </div>
  );
}
