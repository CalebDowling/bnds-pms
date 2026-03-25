import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as net from "net";

const VALID_COMMANDS: Record<string, string> = {
  IP: "IP",   // Immediate Print — read current weight
  T: "T",     // Tare
  Z: "Z",     // Zero
  P: "P",     // Print (stable weight only)
};

function sendCommand(ipAddress: string, port: number, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let data = "";

    socket.setTimeout(5000);

    socket.connect(port, ipAddress, () => {
      socket.write(command + "\r\n");
    });

    socket.on("data", (chunk) => {
      data += chunk.toString();
      if (data.includes("\r\n") || data.includes("\n")) {
        socket.destroy();
        resolve(data.trim());
      }
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Scale did not respond within 5 seconds"));
    });

    socket.on("error", (err) => {
      socket.destroy();
      reject(new Error(`Scale connection error: ${err.message}`));
    });
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ipAddress, port = 9100, command } = await request.json();

  if (!ipAddress || !command) {
    return NextResponse.json({ error: "ipAddress and command are required" }, { status: 400 });
  }

  const cmd = VALID_COMMANDS[command.toUpperCase()];
  if (!cmd) {
    return NextResponse.json(
      { error: `Invalid command. Supported: ${Object.keys(VALID_COMMANDS).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const response = await sendCommand(ipAddress, port, cmd);
    return NextResponse.json({ success: true, command: cmd, response });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Command failed" },
      { status: 500 }
    );
  }
}
