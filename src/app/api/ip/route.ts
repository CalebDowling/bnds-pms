import { getClientIP } from "@/lib/security/ip-allowlist";

export async function GET(request: Request) {
  const ip = getClientIP(request);

  return new Response(
    JSON.stringify({
      ip: ip || "unknown",
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
