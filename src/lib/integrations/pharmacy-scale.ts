// @ts-nocheck
/**
 * Pharmacy Scale Integration — Sartorius / Ohaus
 *
 * Connects to precision scales via the Web Serial API (browser-side) or
 * through the server-side API route at /api/hardware/scale.
 *
 * Supported protocols:
 *   - Sartorius SBI (Standard Bidirectional Interface)
 *   - Ohaus (Adventurer / Scout series continuous output)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum ScaleProtocol {
  SARTORIUS_SBI = "SARTORIUS_SBI",
  OHAUS = "OHAUS",
}

export type WeightUnit = "g" | "mg" | "kg" | "oz";

export interface ScaleReading {
  /** Numeric weight value */
  value: number;
  /** Unit of measurement */
  unit: WeightUnit;
  /** Whether the reading is stable (not fluctuating) */
  stable: boolean;
  /** Raw string received from the scale */
  raw: string;
  /** Timestamp of reading (ISO-8601) */
  timestamp: string;
  /** Protocol used to parse the reading */
  protocol: ScaleProtocol;
}

export interface ScaleConnectionOptions {
  /** Serial port baud rate — default 9600 */
  baudRate?: number;
  /** Data bits — default 8 */
  dataBits?: 7 | 8;
  /** Stop bits — default 1 */
  stopBits?: 1 | 2;
  /** Parity — default "none" */
  parity?: "none" | "even" | "odd";
  /** Protocol to use when parsing data */
  protocol: ScaleProtocol;
}

// ---------------------------------------------------------------------------
// Protocol configuration defaults
// ---------------------------------------------------------------------------

export const SCALE_PROTOCOLS: Record<
  ScaleProtocol,
  { baudRate: number; dataBits: 7 | 8; stopBits: 1 | 2; parity: "none" | "even" | "odd"; lineTerminator: string }
> = {
  [ScaleProtocol.SARTORIUS_SBI]: {
    baudRate: 9600,
    dataBits: 7,
    stopBits: 1,
    parity: "odd",
    lineTerminator: "\r\n",
  },
  [ScaleProtocol.OHAUS]: {
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    lineTerminator: "\r\n",
  },
};

// ---------------------------------------------------------------------------
// Commands sent to the scale
// ---------------------------------------------------------------------------

/** Standard commands for supported protocols */
export const SCALE_COMMANDS = {
  [ScaleProtocol.SARTORIUS_SBI]: {
    /** Request a single stable weight reading */
    print: "\x1bP\r\n",
    /** Tare the scale */
    tare: "\x1bT\r\n",
    /** Zero the scale */
    zero: "\x1bZ\r\n",
  },
  [ScaleProtocol.OHAUS]: {
    /** Request a single stable weight reading */
    print: "P\r\n",
    /** Tare the scale */
    tare: "T\r\n",
    /** Zero the scale */
    zero: "Z\r\n",
  },
} as const;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Unit string normalisation.
 * Scales may report "g", "G", "mg", "kg", "oz", "OZ", etc.
 */
function normalizeUnit(raw: string): WeightUnit {
  const u = raw.trim().toLowerCase();
  if (u === "g" || u === "gm" || u === "gram" || u === "grams") return "g";
  if (u === "mg" || u === "milligram" || u === "milligrams") return "mg";
  if (u === "kg" || u === "kilogram" || u === "kilograms") return "kg";
  if (u === "oz" || u === "ounce" || u === "ounces") return "oz";
  // Default to grams when unrecognised
  return "g";
}

/**
 * Parse a raw data line from a Sartorius SBI scale.
 *
 * Typical SBI output format (16 characters + CR LF):
 *   Positions 0-5  : weight value (right-justified, space-padded)
 *   Position  6    : space
 *   Positions 7-8  : unit (e.g. " g", "mg", "kg")
 *   Position  9    : stability indicator — space = stable, "?" = unstable
 *
 * Example: "  12.34  g \r\n"  (stable, 12.34 g)
 */
function parseSartoriusSBI(raw: string): Omit<ScaleReading, "timestamp" | "protocol"> | null {
  const trimmed = raw.replace(/[\r\n]+$/, "");
  if (trimmed.length < 6) return null;

  // Sartorius SBI: the line is typically 16 chars but can vary slightly.
  // Strategy: extract number and unit via regex.
  const match = trimmed.match(/([+-]?\s*[\d.]+)\s+(g|mg|kg|oz|gm|lb)\s*([? ]?)/i);
  if (!match) return null;

  const valueStr = match[1].replace(/\s/g, "");
  const value = parseFloat(valueStr);
  if (isNaN(value)) return null;

  const unit = normalizeUnit(match[2]);
  // "?" in stability position means unstable
  const stable = match[3]?.trim() !== "?";

  return { value, unit, stable, raw };
}

/**
 * Parse a raw data line from an Ohaus scale.
 *
 * Ohaus continuous/print output example:
 *   "ST,GS,    12.34 g"   (stable, gross, 12.34 g)
 *   "US,GS,    12.34 g"   (unstable, gross)
 *   "ST,NT,     0.00 g"   (stable, net)
 *
 * Some Ohaus models omit the prefix and just send the number + unit.
 */
function parseOhaus(raw: string): Omit<ScaleReading, "timestamp" | "protocol"> | null {
  const trimmed = raw.replace(/[\r\n]+$/, "");
  if (trimmed.length < 3) return null;

  // Stability flag from prefix
  let stable = true;
  if (/^US[,\s]/i.test(trimmed)) {
    stable = false;
  } else if (/^ST[,\s]/i.test(trimmed)) {
    stable = true;
  }

  // Extract numeric value and unit
  const match = trimmed.match(/([+-]?\s*[\d.]+)\s*(g|mg|kg|oz|gm|lb)/i);
  if (!match) return null;

  const value = parseFloat(match[1].replace(/\s/g, ""));
  if (isNaN(value)) return null;

  const unit = normalizeUnit(match[2]);

  return { value, unit, stable, raw };
}

/**
 * Parse a raw data string from a scale using the specified protocol.
 * Returns `null` if the data cannot be parsed.
 */
export function parseScaleData(
  raw: string,
  protocol: ScaleProtocol,
): ScaleReading | null {
  let partial: Omit<ScaleReading, "timestamp" | "protocol"> | null = null;

  switch (protocol) {
    case ScaleProtocol.SARTORIUS_SBI:
      partial = parseSartoriusSBI(raw);
      break;
    case ScaleProtocol.OHAUS:
      partial = parseOhaus(raw);
      break;
    default:
      return null;
  }

  if (!partial) return null;

  return {
    ...partial,
    protocol,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Web Serial API helpers (browser-only)
// ---------------------------------------------------------------------------

/**
 * Checks whether the Web Serial API is available in the current environment.
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

/**
 * Manages a live connection to a serial scale via the Web Serial API.
 *
 * Usage:
 * ```ts
 * const connection = new ScaleConnection({ protocol: ScaleProtocol.OHAUS });
 * await connection.open();
 * connection.onReading = (r) => console.log(r);
 * // … later
 * await connection.close();
 * ```
 */
export class ScaleConnection {
  private port: any | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private readLoopActive = false;
  private options: Required<ScaleConnectionOptions>;

  /** Called whenever a new parsed reading is available */
  onReading: ((reading: ScaleReading) => void) | null = null;
  /** Called on error */
  onError: ((error: Error) => void) | null = null;

  constructor(opts: ScaleConnectionOptions) {
    const defaults = SCALE_PROTOCOLS[opts.protocol];
    this.options = {
      baudRate: opts.baudRate ?? defaults.baudRate,
      dataBits: opts.dataBits ?? defaults.dataBits,
      stopBits: opts.stopBits ?? defaults.stopBits,
      parity: opts.parity ?? defaults.parity,
      protocol: opts.protocol,
    };
  }

  /** Prompt the user to select a serial port and open it. */
  async open(): Promise<void> {
    if (!isWebSerialSupported()) {
      throw new Error("Web Serial API is not supported in this browser.");
    }

    this.port = await (navigator as any).serial.requestPort();
    await this.port.open({
      baudRate: this.options.baudRate,
      dataBits: this.options.dataBits,
      stopBits: this.options.stopBits,
      parity: this.options.parity,
    });

    this.startReadLoop();
  }

  /** Open a previously-granted port (no user prompt). */
  async openPort(port: SerialPort): Promise<void> {
    this.port = port;
    await this.port.open({
      baudRate: this.options.baudRate,
      dataBits: this.options.dataBits,
      stopBits: this.options.stopBits,
      parity: this.options.parity,
    });
    this.startReadLoop();
  }

  /** Send a command string to the scale. */
  async sendCommand(command: string): Promise<void> {
    if (!this.port?.writable) {
      throw new Error("Scale port is not open for writing.");
    }
    const writer = this.port.writable.getWriter();
    try {
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(command));
    } finally {
      writer.releaseLock();
    }
  }

  /** Send the tare command for the current protocol. */
  async tare(): Promise<void> {
    await this.sendCommand(SCALE_COMMANDS[this.options.protocol].tare);
  }

  /** Send the zero command for the current protocol. */
  async zero(): Promise<void> {
    await this.sendCommand(SCALE_COMMANDS[this.options.protocol].zero);
  }

  /** Request a print / single reading from the scale. */
  async requestReading(): Promise<void> {
    await this.sendCommand(SCALE_COMMANDS[this.options.protocol].print);
  }

  /** Close the serial connection and stop the read loop. */
  async close(): Promise<void> {
    this.readLoopActive = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        // Ignore cancel errors
      }
      this.reader = null;
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // Ignore close errors
      }
      this.port = null;
    }
  }

  /** Whether the connection is currently open. */
  get isConnected(): boolean {
    return this.port !== null && this.readLoopActive;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private startReadLoop(): void {
    if (!this.port?.readable) return;

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();
    this.readLoopActive = true;

    let buffer = "";

    const loop = async () => {
      try {
        while (this.readLoopActive && this.reader) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (!value) continue;

          buffer += value;

          // Split on line terminator
          const terminator = SCALE_PROTOCOLS[this.options.protocol].lineTerminator;
          const lines = buffer.split(terminator);
          // Keep the last (possibly incomplete) chunk in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const reading = parseScaleData(line, this.options.protocol);
            if (reading && this.onReading) {
              this.onReading(reading);
            }
          }
        }
      } catch (err) {
        if (this.readLoopActive && this.onError) {
          this.onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    // Fire and forget — the loop resolves when the port is closed or an error occurs.
    void loop();
    void readableStreamClosed.catch(() => {});
  }
}
