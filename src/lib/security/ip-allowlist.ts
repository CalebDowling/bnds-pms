import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";

/**
 * Extract client IP from request headers
 * Tries multiple headers in order of precedence
 */
export function getClientIP(request: Request): string | null {
  const headers = request.headers;

  // Try X-Forwarded-For first (proxies, load balancers)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // Try X-Real-IP (nginx proxy)
  const realIP = headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Try CF-Connecting-IP (Cloudflare)
  const cfIP = headers.get("cf-connecting-ip");
  if (cfIP) {
    return cfIP;
  }

  return null;
}

/**
 * Parse CIDR notation into network and mask
 * e.g., "192.168.1.0/24" -> { network: "192.168.1.0", mask: 24 }
 */
export function parseCIDR(cidr: string): { network: string; mask: number } {
  const [network, maskStr] = cidr.split("/");
  const mask = maskStr ? parseInt(maskStr, 10) : 32;

  if (!network || mask < 0 || mask > 32) {
    throw new Error(`Invalid CIDR notation: ${cidr}`);
  }

  return { network, mask };
}

/**
 * Convert IPv4 string to 32-bit number
 */
function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return (
    (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
  );
}

/**
 * Check if an IP falls within a CIDR range
 */
export function ipInRange(
  ip: string,
  network: string,
  mask: number
): boolean {
  try {
    const ipNum = ipToNumber(ip);
    const networkNum = ipToNumber(network);

    // Create mask: for /24, we want 0xFFFFFF00
    const maskBits = (0xffffffff << (32 - mask)) >>> 0;

    return (ipNum & maskBits) === (networkNum & maskBits);
  } catch {
    return false;
  }
}

/**
 * Check if an IP is allowed based on allowlist
 * Supports both individual IPs (192.168.1.1) and CIDR notation (192.168.1.0/24)
 */
export function isIPAllowed(ip: string | null, allowList: string[]): boolean {
  if (!ip || allowList.length === 0) {
    return false;
  }

  return allowList.some((entry) => {
    if (entry.includes("/")) {
      // CIDR notation
      const { network, mask } = parseCIDR(entry);
      return ipInRange(ip, network, mask);
    } else {
      // Individual IP
      return ip === entry;
    }
  });
}

/**
 * Parse IP allowlist from JSON string (stored in StoreSetting)
 */
export function parseIPAllowlist(
  jsonStr: string
): { ips: string[]; enabled: boolean } {
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      ips: Array.isArray(parsed.ips) ? parsed.ips : [],
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : false,
    };
  } catch {
    return { ips: [], enabled: false };
  }
}

/**
 * Serialize IP allowlist to JSON string
 */
export function serializeIPAllowlist(
  ips: string[],
  enabled: boolean
): string {
  return JSON.stringify({ ips, enabled });
}
