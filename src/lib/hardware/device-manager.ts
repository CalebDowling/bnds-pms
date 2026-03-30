/**
 * Pharmacy Hardware Device Manager
 *
 * Unified abstraction for pharmacy automation hardware:
 *   - Eyecon pill counter (visual counting verification)
 *   - ScriptPro dispensing robot (automated vial filling)
 *   - Yuyama packaging system (unit-dose/compliance packaging)
 *
 * Architecture:
 *   PMS API → DeviceManager → Device Driver → Hardware (via TCP/Serial/HTTP)
 *   Hardware → Status callback → PMS API → Keragon event
 *
 * Each device connects over the local network. The driver handles
 * protocol-specific communication (HL7, TCP sockets, REST API)
 * while this manager provides a unified interface.
 */

import { logger } from "@/lib/logger";
import { onHardwareCountComplete, onHardwareError } from "@/lib/integrations/keragon-events";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface DeviceConfig {
  type: DeviceType;
  id: string;
  name: string;
  host: string;         // IP or hostname
  port: number;
  protocol: "tcp" | "http" | "serial";
  enabled: boolean;
  apiKey?: string;       // For HTTP-based devices
  serialPort?: string;   // For serial connections
  baudRate?: number;
  timeout?: number;      // Connection timeout in ms
  metadata?: Record<string, any>;
}

export type DeviceType = "eyecon" | "scriptpro" | "yuyama" | "kirby_lester" | "parata" | "generic";

export type DeviceStatus = "online" | "offline" | "busy" | "error" | "unknown";

// Read device configs from environment
function getDeviceConfigs(): DeviceConfig[] {
  const configs: DeviceConfig[] = [];

  // Eyecon
  if (process.env.EYECON_HOST) {
    configs.push({
      type: "eyecon",
      id: "eyecon-1",
      name: process.env.EYECON_NAME || "Eyecon Pill Counter",
      host: process.env.EYECON_HOST,
      port: parseInt(process.env.EYECON_PORT || "5000"),
      protocol: "tcp",
      enabled: process.env.EYECON_ENABLED !== "false",
      timeout: parseInt(process.env.EYECON_TIMEOUT || "10000"),
    });
  }

  // ScriptPro
  if (process.env.SCRIPTPRO_HOST) {
    configs.push({
      type: "scriptpro",
      id: "scriptpro-1",
      name: process.env.SCRIPTPRO_NAME || "ScriptPro Robot",
      host: process.env.SCRIPTPRO_HOST,
      port: parseInt(process.env.SCRIPTPRO_PORT || "8080"),
      protocol: "http",
      enabled: process.env.SCRIPTPRO_ENABLED !== "false",
      apiKey: process.env.SCRIPTPRO_API_KEY,
      timeout: parseInt(process.env.SCRIPTPRO_TIMEOUT || "30000"),
    });
  }

  // Yuyama
  if (process.env.YUYAMA_HOST) {
    configs.push({
      type: "yuyama",
      id: "yuyama-1",
      name: process.env.YUYAMA_NAME || "Yuyama Packaging System",
      host: process.env.YUYAMA_HOST,
      port: parseInt(process.env.YUYAMA_PORT || "9100"),
      protocol: "tcp",
      enabled: process.env.YUYAMA_ENABLED !== "false",
      timeout: parseInt(process.env.YUYAMA_TIMEOUT || "15000"),
    });
  }

  return configs;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CountRequest {
  /** Prescription fill ID */
  fillId: string;
  /** NDC of the drug */
  ndc: string;
  /** Drug name for display */
  drugName: string;
  /** Expected quantity to count */
  expectedQuantity: number;
  /** Which device to use (defaults to first available counter) */
  deviceId?: string;
}

export interface CountResult {
  success: boolean;
  deviceId: string;
  deviceType: DeviceType;
  ndc: string;
  drugName: string;
  countedQuantity: number;
  expectedQuantity: number;
  verified: boolean;       // true if counted === expected
  discrepancy: number;     // difference (counted - expected)
  timestamp: string;
  imageUrl?: string;       // Eyecon captures an image
  error?: string;
}

export interface DispenseRequest {
  fillId: string;
  ndc: string;
  drugName: string;
  quantity: number;
  vialSize?: string;
  labelData?: Record<string, string>;
  deviceId?: string;
}

export interface DispenseResult {
  success: boolean;
  deviceId: string;
  deviceType: DeviceType;
  ndc: string;
  dispensedQuantity: number;
  cellId?: string;        // ScriptPro cell that dispensed
  lotNumber?: string;
  expirationDate?: string;
  timestamp: string;
  error?: string;
}

export interface PackageRequest {
  patientId: string;
  patientName: string;
  medications: Array<{
    ndc: string;
    drugName: string;
    quantity: number;
    adminTime: string;    // When to take (e.g., "08:00", "20:00")
    sig: string;
  }>;
  startDate: string;      // YYYY-MM-DD
  endDate: string;
  deviceId?: string;
}

export interface PackageResult {
  success: boolean;
  deviceId: string;
  deviceType: DeviceType;
  packagesCreated: number;
  daysPackaged: number;
  timestamp: string;
  error?: string;
}

export interface DeviceStatusInfo {
  deviceId: string;
  deviceType: DeviceType;
  name: string;
  status: DeviceStatus;
  host: string;
  port: number;
  enabled: boolean;
  lastSeen?: string;
  firmware?: string;
  cellCount?: number;     // ScriptPro: number of loaded cells
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Device Manager
// ---------------------------------------------------------------------------

class DeviceManager {
  private configs: DeviceConfig[] = [];

  constructor() {
    this.configs = getDeviceConfigs();
  }

  /** Reload configs from environment */
  reload(): void {
    this.configs = getDeviceConfigs();
  }

  /** Get all configured devices */
  getDevices(): DeviceConfig[] {
    return this.configs;
  }

  /** Get a specific device by ID */
  getDevice(deviceId: string): DeviceConfig | undefined {
    return this.configs.find((d) => d.id === deviceId);
  }

  /** Find first enabled device of a given type */
  findDevice(type: DeviceType): DeviceConfig | undefined {
    return this.configs.find((d) => d.type === type && d.enabled);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Pill Counting (Eyecon)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send a count request to the Eyecon pill counter.
   *
   * The Eyecon uses a TCP socket protocol:
   *   Send: COUNT|{ndc}|{expected_qty}\n
   *   Recv: RESULT|{ndc}|{counted_qty}|{verified}|{image_url}\n
   *
   * In production, replace the simulated driver below with actual
   * TCP socket communication to the Eyecon device.
   */
  async countPills(request: CountRequest): Promise<CountResult> {
    const device = request.deviceId
      ? this.getDevice(request.deviceId)
      : this.findDevice("eyecon");

    if (!device) {
      return {
        success: false,
        deviceId: "none",
        deviceType: "eyecon",
        ndc: request.ndc,
        drugName: request.drugName,
        countedQuantity: 0,
        expectedQuantity: request.expectedQuantity,
        verified: false,
        discrepancy: -request.expectedQuantity,
        timestamp: new Date().toISOString(),
        error: "No Eyecon device configured or available",
      };
    }

    logger.info(`[Hardware] Counting pills on ${device.name}: NDC=${request.ndc} expected=${request.expectedQuantity}`);

    try {
      const result = await this.eyeconCount(device, request);

      // Fire Keragon event
      await onHardwareCountComplete({
        deviceType: "eyecon",
        deviceId: device.id,
        ndc: request.ndc,
        drugName: request.drugName,
        countedQuantity: result.countedQuantity,
        expectedQuantity: request.expectedQuantity,
        fillId: request.fillId,
        discrepancy: result.countedQuantity !== request.expectedQuantity,
      }).catch(() => {});

      return result;
    } catch (err: any) {
      logger.error(`[Hardware] Eyecon count error:`, err);

      await onHardwareError({
        deviceType: "eyecon",
        deviceId: device.id,
        errorMessage: err.message,
        severity: "error",
      }).catch(() => {});

      return {
        success: false,
        deviceId: device.id,
        deviceType: "eyecon",
        ndc: request.ndc,
        drugName: request.drugName,
        countedQuantity: 0,
        expectedQuantity: request.expectedQuantity,
        verified: false,
        discrepancy: -request.expectedQuantity,
        timestamp: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  /**
   * Eyecon TCP protocol driver.
   *
   * TODO: Replace with actual TCP socket implementation when hardware
   * is connected. Current implementation uses HTTP fallback for development.
   */
  private async eyeconCount(device: DeviceConfig, request: CountRequest): Promise<CountResult> {
    const url = `http://${device.host}:${device.port}/api/count`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), device.timeout || 10000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ndc: request.ndc,
          expectedQuantity: request.expectedQuantity,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Eyecon returned ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        deviceId: device.id,
        deviceType: "eyecon",
        ndc: request.ndc,
        drugName: request.drugName,
        countedQuantity: data.countedQuantity || 0,
        expectedQuantity: request.expectedQuantity,
        verified: data.countedQuantity === request.expectedQuantity,
        discrepancy: (data.countedQuantity || 0) - request.expectedQuantity,
        timestamp: new Date().toISOString(),
        imageUrl: data.imageUrl,
      };
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Robotic Dispensing (ScriptPro)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send a dispense request to ScriptPro.
   *
   * ScriptPro uses an HTTP REST API:
   *   POST /api/v1/dispense { ndc, quantity, vialSize, labelData }
   *   Response: { dispensedQuantity, cellId, lotNumber, expirationDate }
   */
  async dispense(request: DispenseRequest): Promise<DispenseResult> {
    const device = request.deviceId
      ? this.getDevice(request.deviceId)
      : this.findDevice("scriptpro");

    if (!device) {
      return {
        success: false,
        deviceId: "none",
        deviceType: "scriptpro",
        ndc: request.ndc,
        dispensedQuantity: 0,
        timestamp: new Date().toISOString(),
        error: "No ScriptPro device configured or available",
      };
    }

    logger.info(`[Hardware] Dispensing on ${device.name}: NDC=${request.ndc} qty=${request.quantity}`);

    try {
      const url = `http://${device.host}:${device.port}/api/v1/dispense`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), device.timeout || 30000);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (device.apiKey) {
        headers["Authorization"] = `Bearer ${device.apiKey}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ndc: request.ndc,
          quantity: request.quantity,
          vialSize: request.vialSize,
          labelData: request.labelData,
          fillId: request.fillId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`ScriptPro returned ${response.status}`);
      }

      const data = await response.json();

      // Fire Keragon event
      await onHardwareCountComplete({
        deviceType: "scriptpro",
        deviceId: device.id,
        ndc: request.ndc,
        drugName: request.drugName,
        countedQuantity: data.dispensedQuantity || request.quantity,
        expectedQuantity: request.quantity,
        fillId: request.fillId,
        discrepancy: false,
      }).catch(() => {});

      return {
        success: true,
        deviceId: device.id,
        deviceType: "scriptpro",
        ndc: request.ndc,
        dispensedQuantity: data.dispensedQuantity || request.quantity,
        cellId: data.cellId,
        lotNumber: data.lotNumber,
        expirationDate: data.expirationDate,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      logger.error(`[Hardware] ScriptPro dispense error:`, err);

      await onHardwareError({
        deviceType: "scriptpro",
        deviceId: device.id,
        errorMessage: err.message,
        severity: "error",
      }).catch(() => {});

      return {
        success: false,
        deviceId: device.id,
        deviceType: "scriptpro",
        ndc: request.ndc,
        dispensedQuantity: 0,
        timestamp: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Compliance Packaging (Yuyama)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send a packaging request to Yuyama.
   *
   * Yuyama uses a TCP-based HL7/proprietary protocol.
   * TODO: Replace with actual TCP implementation when hardware arrives.
   */
  async package(request: PackageRequest): Promise<PackageResult> {
    const device = request.deviceId
      ? this.getDevice(request.deviceId)
      : this.findDevice("yuyama");

    if (!device) {
      return {
        success: false,
        deviceId: "none",
        deviceType: "yuyama",
        packagesCreated: 0,
        daysPackaged: 0,
        timestamp: new Date().toISOString(),
        error: "No Yuyama device configured or available",
      };
    }

    logger.info(`[Hardware] Packaging on ${device.name}: patient=${request.patientName} meds=${request.medications.length}`);

    try {
      const url = `http://${device.host}:${device.port}/api/package`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), device.timeout || 15000);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: request.patientId,
          patientName: request.patientName,
          medications: request.medications,
          startDate: request.startDate,
          endDate: request.endDate,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Yuyama returned ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        deviceId: device.id,
        deviceType: "yuyama",
        packagesCreated: data.packagesCreated || 0,
        daysPackaged: data.daysPackaged || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      logger.error(`[Hardware] Yuyama packaging error:`, err);

      await onHardwareError({
        deviceType: "yuyama",
        deviceId: device.id,
        errorMessage: err.message,
        severity: "error",
      }).catch(() => {});

      return {
        success: false,
        deviceId: device.id,
        deviceType: "yuyama",
        packagesCreated: 0,
        daysPackaged: 0,
        timestamp: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Device Status
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check status of all configured devices by attempting a health check.
   */
  async getStatus(): Promise<DeviceStatusInfo[]> {
    const results: DeviceStatusInfo[] = [];

    for (const device of this.configs) {
      const info: DeviceStatusInfo = {
        deviceId: device.id,
        deviceType: device.type,
        name: device.name,
        status: "unknown",
        host: device.host,
        port: device.port,
        enabled: device.enabled,
      };

      if (!device.enabled) {
        info.status = "offline";
        results.push(info);
        continue;
      }

      try {
        const url = `http://${device.host}:${device.port}/api/status`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (response.ok) {
          const data = await response.json();
          info.status = data.status || "online";
          info.lastSeen = new Date().toISOString();
          info.firmware = data.firmware;
          info.cellCount = data.cellCount;
        } else {
          info.status = "error";
          info.errorMessage = `HTTP ${response.status}`;
        }
      } catch (err: any) {
        info.status = err.name === "AbortError" ? "offline" : "error";
        info.errorMessage = err.message;
      }

      results.push(info);
    }

    return results;
  }

  /**
   * Check status of a single device.
   */
  async getDeviceStatus(deviceId: string): Promise<DeviceStatusInfo | null> {
    const all = await this.getStatus();
    return all.find((d) => d.deviceId === deviceId) || null;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const deviceManager = new DeviceManager();
