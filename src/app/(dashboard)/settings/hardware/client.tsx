"use client";

import { useState } from "react";
import type { ScaleConfig } from "./actions";

interface HardwareConfig {
  labelPrinter: {
    name: string;
    paperSize: "4x2.5" | "4x6";
  };
  receiptPrinter: {
    name: string;
    paperWidth: "2" | "3" | "4";
  };
  barcodeScanner: {
    type: "USB" | "Bluetooth";
    name?: string;
  };
  cashDrawer: {
    type: "Serial" | "Network" | "USB";
    name?: string;
  };
  scales: ScaleConfig[];
}

interface HardwareClientProps {
  initialConfig: HardwareConfig;
}

export default function HardwareClient({ initialConfig }: HardwareClientProps) {
  const [config, setConfig] = useState<HardwareConfig>({
    ...initialConfig,
    scales: initialConfig.scales || [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedScale, setExpandedScale] = useState<string | null>(null);
  const [testingScale, setTestingScale] = useState<string | null>(null);
  const [scaleTestResult, setScaleTestResult] = useState<Record<string, { success: boolean; message: string }>>({});

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/settings/hardware/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error("Failed to save configuration");
      }

      setSuccess("Hardware configuration saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPrint = async (device: "labelPrinter" | "receiptPrinter") => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/hardware/test-print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device,
          printerName: device === "labelPrinter" ? config.labelPrinter.name : config.receiptPrinter.name,
        }),
      });

      if (!response.ok) {
        throw new Error("Test print failed");
      }

      setSuccess(`${device === "labelPrinter" ? "Label" : "Receipt"} printer test sent`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test print failed");
    }
  };

  const handleTestScan = async () => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/hardware/test-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scannerType: config.barcodeScanner.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Scanner test failed");
      }

      setSuccess("Barcode scanner test initiated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scanner test failed");
    }
  };

  const handleTestDrawer = async () => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/hardware/test-drawer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drawerType: config.cashDrawer.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Cash drawer test failed");
      }

      setSuccess("Cash drawer test sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cash drawer test failed");
    }
  };

  const handleDetectDevices = async () => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/hardware/detect-devices", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Device detection failed");
      }

      const devices = await response.json();
      setSuccess(`Detected ${devices.length} devices`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Device detection failed");
    }
  };

  const handleAddScale = () => {
    const newScale: ScaleConfig = {
      id: crypto.randomUUID(),
      model: "Ohaus Scout",
      ipAddress: "",
      port: 9100,
      unit: "g",
      name: `Scale ${config.scales.length + 1}`,
      enabled: true,
    };
    setConfig({ ...config, scales: [...config.scales, newScale] });
    setExpandedScale(newScale.id);
  };

  const handleRemoveScale = (id: string) => {
    setConfig({ ...config, scales: config.scales.filter((s) => s.id !== id) });
    if (expandedScale === id) setExpandedScale(null);
  };

  const handleUpdateScale = (id: string, updates: Partial<ScaleConfig>) => {
    setConfig({
      ...config,
      scales: config.scales.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    });
  };

  const handleTestScale = async (scale: ScaleConfig) => {
    if (!scale.ipAddress) {
      setScaleTestResult({ ...scaleTestResult, [scale.id]: { success: false, message: "IP address required" } });
      return;
    }
    setTestingScale(scale.id);
    setScaleTestResult({ ...scaleTestResult, [scale.id]: { success: false, message: "" } });

    try {
      const res = await fetch("/api/hardware/test-scale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAddress: scale.ipAddress, port: scale.port }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScaleTestResult({ ...scaleTestResult, [scale.id]: { success: true, message: `Connected! Weight: ${data.weight} ${data.unit}` } });
      } else {
        setScaleTestResult({ ...scaleTestResult, [scale.id]: { success: false, message: data.error || "Connection failed" } });
      }
    } catch {
      setScaleTestResult({ ...scaleTestResult, [scale.id]: { success: false, message: "Network error" } });
    } finally {
      setTestingScale(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hardware Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Configure printers, scanners, and peripherals</p>
        </div>
        <button
          onClick={handleDetectDevices}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Detect Devices
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Label Printer */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Label Printer</h3>
              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
            </div>
            <button
              onClick={() => handleTestPrint("labelPrinter")}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              Test Print
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Printer Name
              </label>
              <input
                type="text"
                value={config.labelPrinter.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfig({
                    ...config,
                    labelPrinter: { ...config.labelPrinter, name: e.target.value },
                  })
                }
                placeholder="e.g., Zebra ZP500"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paper Size
              </label>
              <select
                value={config.labelPrinter.paperSize}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setConfig({
                    ...config,
                    labelPrinter: {
                      ...config.labelPrinter,
                      paperSize: e.target.value as "4x2.5" | "4x6",
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="4x6">4x6 inches</option>
                <option value="4x2.5">4x2.5 inches</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Printer */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Receipt Printer</h3>
              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
            </div>
            <button
              onClick={() => handleTestPrint("receiptPrinter")}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              Test Print
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Printer Name
              </label>
              <input
                type="text"
                value={config.receiptPrinter.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfig({
                    ...config,
                    receiptPrinter: { ...config.receiptPrinter, name: e.target.value },
                  })
                }
                placeholder="e.g., Star Micronics TSP100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paper Width
              </label>
              <select
                value={config.receiptPrinter.paperWidth}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setConfig({
                    ...config,
                    receiptPrinter: {
                      ...config.receiptPrinter,
                      paperWidth: e.target.value as "2" | "3" | "4",
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="2">2 inches</option>
                <option value="3">3 inches</option>
                <option value="4">4 inches</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Scanner */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Barcode Scanner</h3>
              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
            </div>
            <button
              onClick={handleTestScan}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              Test Scan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connection Type
              </label>
              <select
                value={config.barcodeScanner.type}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    barcodeScanner: {
                      ...config.barcodeScanner,
                      type: e.target.value as "USB" | "Bluetooth",
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="USB">USB</option>
                <option value="Bluetooth">Bluetooth</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Device Name
              </label>
              <input
                type="text"
                value={config.barcodeScanner.name || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfig({
                    ...config,
                    barcodeScanner: { ...config.barcodeScanner, name: e.target.value },
                  })
                }
                placeholder="e.g., Honeywell HF680"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cash Drawer */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Cash Drawer</h3>
              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
            </div>
            <button
              onClick={handleTestDrawer}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              Test Open
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connection Type
              </label>
              <select
                value={config.cashDrawer.type}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    cashDrawer: {
                      ...config.cashDrawer,
                      type: e.target.value as "Serial" | "Network" | "USB",
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Serial">Serial</option>
                <option value="Network">Network</option>
                <option value="USB">USB</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Device Name/Port
              </label>
              <input
                type="text"
                value={config.cashDrawer.name || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfig({
                    ...config,
                    cashDrawer: { ...config.cashDrawer, name: e.target.value },
                  })
                }
                placeholder="e.g., COM1 or /dev/ttyUSB0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ohaus Scales */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Ohaus Scales</h3>
              <p className="text-xs text-gray-500 mt-0.5">Connect compounding scales via IP network</p>
            </div>
            <button
              onClick={handleAddScale}
              className="px-3 py-1.5 bg-[#40721D] text-white rounded text-sm font-medium hover:bg-[#2D5114]"
            >
              + Add Scale
            </button>
          </div>

          {config.scales.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              No scales configured. Click &quot;Add Scale&quot; to connect an Ohaus scale.
            </div>
          ) : (
            <div className="space-y-3">
              {config.scales.map((scale) => {
                const isExpanded = expandedScale === scale.id;
                const testResult = scaleTestResult[scale.id];
                const isTesting = testingScale === scale.id;

                return (
                  <div key={scale.id} className="border border-gray-200 rounded-lg">
                    {/* Scale Row Header */}
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedScale(isExpanded ? null : scale.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">&#9878;</span>
                        <div>
                          <span className="font-medium text-gray-900 text-sm">{scale.name || "Unnamed Scale"}</span>
                          <span className="text-xs text-gray-400 ml-2">{scale.model}</span>
                        </div>
                        {scale.ipAddress && (
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                            {scale.ipAddress}:{scale.port}
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          scale.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                        }`}>
                          {scale.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleTestScale(scale)}
                          disabled={isTesting || !scale.ipAddress}
                          className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                          {isTesting ? "Testing..." : "Test Connection"}
                        </button>
                        <button
                          onClick={() => handleRemoveScale(scale.id)}
                          className="px-2 py-1 text-red-500 hover:bg-red-50 rounded text-sm"
                          title="Remove scale"
                        >
                          &#10005;
                        </button>
                      </div>
                    </div>

                    {/* Test Result */}
                    {testResult && testResult.message && (
                      <div className={`mx-4 mb-2 px-3 py-2 rounded text-xs ${
                        testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}>
                        {testResult.message}
                      </div>
                    )}

                    {/* Expanded Edit Form */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Scale Name</label>
                            <input
                              type="text"
                              value={scale.name}
                              onChange={(e) => handleUpdateScale(scale.id, { name: e.target.value })}
                              placeholder="e.g., Compounding Station 1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                            <select
                              value={scale.model}
                              onChange={(e) => handleUpdateScale(scale.id, { model: e.target.value as ScaleConfig["model"] })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="Ohaus Scout">Ohaus Scout</option>
                              <option value="Ohaus Explorer">Ohaus Explorer</option>
                              <option value="Ohaus Adventurer">Ohaus Adventurer</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Weight Unit</label>
                            <select
                              value={scale.unit}
                              onChange={(e) => handleUpdateScale(scale.id, { unit: e.target.value as ScaleConfig["unit"] })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="g">Grams (g)</option>
                              <option value="mg">Milligrams (mg)</option>
                              <option value="oz">Ounces (oz)</option>
                              <option value="lb">Pounds (lb)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                            <input
                              type="text"
                              value={scale.ipAddress}
                              onChange={(e) => handleUpdateScale(scale.id, { ipAddress: e.target.value })}
                              placeholder="192.168.1.50"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                            <input
                              type="number"
                              value={scale.port}
                              onChange={(e) => handleUpdateScale(scale.id, { port: parseInt(e.target.value) || 9100 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={scale.enabled}
                                onChange={(e) => handleUpdateScale(scale.id, { enabled: e.target.checked })}
                                className="rounded border-gray-300 text-[#40721D] focus:ring-[#40721D] w-4 h-4"
                              />
                              <span className="text-sm font-medium text-gray-700">Enabled</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
