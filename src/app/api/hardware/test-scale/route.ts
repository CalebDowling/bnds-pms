import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as net from "net";

function connectToScale(ipAddress: string, port: number, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let data = "";

    socket.setTimeout(5000);

    socket.connect(port, ipAddress, () => {
      socket.write(command + "\r\n");
    });

    socket.on("data", (chunk) => {
      data += chunk.toString();
      // Ohaus responses end with \r\n
      if (data.includes("\r\n") || data.includes("\n")) {
        socket.destroy();
        resolve(data.trim());
      }
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Connection timed out (5s). Check IP address and port forwarding."));
    });

    socket.on("error", (err) => {
      socket.destroy();
      if (err.message.includes("ECONNREFUSED")) {
        reject(new Error(`Connection refused at ${ipAddress}:${port}. Verify scale is powered on and port forwarding is configured.`));
      } else if (err.message.includes("EHOSTUNREACH") || err.message.includes("ENETUNREACH")) {
        reject(new Error(`Host unreachable at ${ipAddress}. Check network connectivity.`));
      } else {
        reject(new Error(`Connection error: ${err.message}`));
      }
    });
  });
}

function parseWeightResponse(raw: string): { weight: string; unit: string } | null {
  // Ohaus format: "   12.345 g" or "12.345 mg" or error codes like "ES", "SI"
  const cleaned = raw.trim();

  if (cleaned === "ES") return null; // Error
  if (cleaned === "SI") return null; // Scale in motion

  // Match weight + unit pattern
  const match = cleaned.match(/^([+-]?\s*[\d.]+)\s*(g|mg|oz|lb|kg|ct|dwt|ozt|N|GN)$/i);
  if (match) {
    return { weight: match[1].trim(), unit: match[2].toLowerCase() };
  }

  // Try just a number
  const numMatch = cleaned.match(/^([+-]?\s*[\d.]+)$/);
  if (numMatch) {
    return { weight: numMatch[1].trim(), unit: "g" };
  }

  return null;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ipAddress, port = 9100 } = await request.json();

  if (!ipAddress || typeof ipAddress !== "string") {
    return NextResponse.json({ error: "IP address is required" }, { status: 400 });
  }

  // Basic IP validation
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipPattern.test(ipAddress)) {
    return NextResponse.json({ error: "Invalid IP address format" }, { status: 400 });
  }

  try {
    const raw = await connectToScale(ipAddress, port, "IP");
    const parsed = parseWeightResponse(raw);

    if (parsed) {
      return NextResponse.json({
        success: true,
        weight: parsed.weight,
        unit: parsed.unit,
        rawResponse: raw,
      });
    }

    // Got a response but couldn't parse weight — still connected
    if (raw === "SI") {
      return NextResponse.json({
        success: true,
        weight: null,
        unit: null,
        rawResponse: raw,
        message: "Scale connected but in motion. Wait for stable reading.",
      });
    }

    return NextResponse.json({
      success: true,
      weight: null,
      unit: null,
      rawResponse: raw,
      message: `Connected. Response: ${raw}`,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Connection failed" },
      { status: 200 } // 200 so the client can show the error message
    );
  }
}
