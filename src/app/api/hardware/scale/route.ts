/**
 * API Route — /api/hardware/scale
 *
 * Server-side proxy for pharmacy scale readings.
 * Used when the scale is connected to the server via USB/serial rather than
 * directly to the browser via Web Serial API.
 *
 * GET  /api/hardware/scale?protocol=SARTORIUS_SBI
 *   → Returns the latest scale reading (parsed)
 *
 * POST /api/hardware/scale
 *   body: { command: "tare" | "zero" | "print", protocol: "SARTORIUS_SBI" | "OHAUS" }
 *   → Sends a command to the scale and returns the response
 *
 * Legacy TCP mode (backwards-compatible):
 *   POST with { ipAddress, port, command } — sends raw command over TCP socket
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  parseScaleData,
  ScaleProtocol,
  SCALE_COMMANDS,
  SCALE_PROTOCOLS,
  type ScaleReading,
} from "@/lib/integrations/pharmacy-scale";
import * as net from "net";

// ---------------------------------------------------------------------------
// Server-side serial port management
// ---------------------------------------------------------------------------

interface ServerSerialPort {
  write(data: string): Promise<void>;
  readLine(): Promise<string>;
  isOpen: boolean;
}

// Registry of open ports keyed by protocol
const activePorts = new Map<ScaleProtocol, ServerSerialPort>();

function getPort(protocol: ScaleProtocol): ServerSerialPort | null {
  return activePorts.get(protocol) ?? null;
}

/**
 * Register a server-side serial port for a given protocol.
 * Call this from your server bootstrap code.
 */
export function registerScalePort(
  protocol: ScaleProtocol,
  port: ServerSerialPort,
): void {
  activePorts.set(protocol, port);
}

// ---------------------------------------------------------------------------
// Legacy TCP socket helper (backwards-compatible)
// ---------------------------------------------------------------------------

const LEGACY_COMMANDS: Record<string, string> = {
  IP: "IP",
  T: "T",
  Z: "Z",
  P: "P",
};

function sendTcpCommand(
  ipAddress: string,
  port: number,
  command: string,
): Promise<string> {
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

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isValidProtocol(value: unknown): value is ScaleProtocol {
  return (
    typeof value === "string" &&
    Object.values(ScaleProtocol).includes(value as ScaleProtocol)
  );
}

type ScaleCommand = "tare" | "zero" | "print";

function isValidCommand(value: unknown): value is ScaleCommand {
  return typeof value === "string" && ["tare", "zero", "print"].includes(value);
}

// ---------------------------------------------------------------------------
// GET — Read latest weight via serial port
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const protocolParam = request.nextUrl.searchParams.get("protocol");
  if (!protocolParam || !isValidProtocol(protocolParam)) {
    return NextResponse.json(
      {
        error: "Invalid or missing 'protocol' query parameter.",
        valid: Object.values(ScaleProtocol),
      },
      { status: 400 },
    );
  }
  const protocol = protocolParam as ScaleProtocol;

  const port = getPort(protocol);
  if (!port || !port.isOpen) {
    return NextResponse.json(
      { error: `No scale connected for protocol ${protocol}.` },
      { status: 503 },
    );
  }

  try {
    const cmd = SCALE_COMMANDS[protocol].print;
    await port.write(cmd);
    const raw = await port.readLine();
    const reading = parseScaleData(raw, protocol);

    if (!reading) {
      return NextResponse.json(
        { error: "Unable to parse scale response.", raw },
        { status: 502 },
      );
    }

    return NextResponse.json(reading);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read from scale.", details: String(err) },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Send command via serial port or legacy TCP
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // ---------- Legacy TCP mode ----------
  if (body.ipAddress) {
    const { ipAddress, port: tcpPort = 9100, command } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { error: "ipAddress and command are required" },
        { status: 400 },
      );
    }

    const cmd = LEGACY_COMMANDS[String(command).toUpperCase()];
    if (!cmd) {
      return NextResponse.json(
        {
          error: `Invalid command. Supported: ${Object.keys(LEGACY_COMMANDS).join(", ")}`,
        },
        { status: 400 },
      );
    }

    try {
      const response = await sendTcpCommand(
        String(ipAddress),
        Number(tcpPort),
        cmd,
      );
      return NextResponse.json({ success: true, command: cmd, response });
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          error: err instanceof Error ? err.message : "Command failed",
        },
        { status: 500 },
      );
    }
  }

  // ---------- Protocol-aware serial mode ----------
  const { command, protocol: protocolRaw } = body;

  if (!isValidProtocol(protocolRaw)) {
    return NextResponse.json(
      {
        error: "Invalid or missing 'protocol' in request body.",
        valid: Object.values(ScaleProtocol),
      },
      { status: 400 },
    );
  }
  const protocol = protocolRaw as ScaleProtocol;

  if (!isValidCommand(command)) {
    return NextResponse.json(
      {
        error: "Invalid or missing 'command' in request body.",
        valid: ["tare", "zero", "print"],
      },
      { status: 400 },
    );
  }

  const port = getPort(protocol);
  if (!port || !port.isOpen) {
    return NextResponse.json(
      { error: `No scale connected for protocol ${protocol}.` },
      { status: 503 },
    );
  }

  try {
    const cmd = SCALE_COMMANDS[protocol][command as ScaleCommand];
    await port.write(cmd);

    if (command === "print") {
      const raw = await port.readLine();
      const reading = parseScaleData(raw, protocol);
      return NextResponse.json({
        success: true,
        command,
        reading: reading ?? null,
        raw,
      });
    }

    return NextResponse.json({ success: true, command });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to execute command '${command}'.`,
        details: String(err),
      },
      { status: 500 },
    );
  }
}
