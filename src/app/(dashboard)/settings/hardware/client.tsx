"use client";

import { useState } from "react";
import { Printer, ScanLine, DollarSign, Scale, Plus, Trash2, Wifi, WifiOff } from "lucide-react";
import type { ScaleConfig } from "./actions";

interface HardwareConfig {
  labelPrinter: { name: string; paperSize: "4x2.5" | "4x6" };
  receiptPrinter: { name: string; paperWidth: "2" | "3" | "4" };
  barcodeScanner: { type: "USB" | "Bluetooth"; name?: string };
  cashDrawer: { type: "Serial" | "Network" | "USB"; name?: string };
  scales: ScaleConfig[];
}

type DeviceKey = "labelPrinter" | "receiptPrinter" | "barcodeScanner" | "cashDrawer" | string;

const DEVICES: { key: DeviceKey; label: string; icon: typeof Printer; desc: string }[] = [
  { key: "labelPrinter", label: "Label Printer", icon: Printer, desc: "Prescription labels" },
  { key: "receiptPrinter", label: "Receipt Printer", icon: Printer, desc: "POS receipts" },
  { key: "barcodeScanner", label: "Barcode Scanner", icon: ScanLine, desc: "Rx / NDC scanning" },
  { key: "cashDrawer", label: "Cash Drawer", icon: DollarSign, desc: "POS cash drawer" },
];

export default function HardwareClient({ initialConfig }: { initialConfig: HardwareConfig }) {
  const [config, setConfig] = useState<HardwareConfig>({ ...initialConfig, scales: initialConfig.scales || [] });
  const [selected, setSelected] = useState<DeviceKey>("labelPrinter");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testingScale, setTestingScale] = useState<string | null>(null);
  const [scaleTestResult, setScaleTestResult] = useState<Record<string, { success: boolean; message: string }>>({});

  const handleSave = async () => {
    setMessage(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/hardware/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Configuration saved" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async (device: string) => {
    setMessage(null);
    try {
      let endpoint = "";
      let body = {};
      if (device === "labelPrinter" || device === "receiptPrinter") {
        endpoint = "/api/hardware/test-print";
        body = { device, printerName: device === "labelPrinter" ? config.labelPrinter.name : config.receiptPrinter.name };
      } else if (device === "barcodeScanner") {
        endpoint = "/api/hardware/test-scan";
        body = { scannerType: config.barcodeScanner.type };
      } else if (device === "cashDrawer") {
        endpoint = "/api/hardware/test-drawer";
        body = { drawerType: config.cashDrawer.type };
      }
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Test failed");
      setMessage({ type: "success", text: "Test sent successfully" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Test failed" });
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
    setSelected(newScale.id);
  };

  const handleRemoveScale = (id: string) => {
    setConfig({ ...config, scales: config.scales.filter((s) => s.id !== id) });
    if (selected === id) setSelected("labelPrinter");
  };

  const handleUpdateScale = (id: string, updates: Partial<ScaleConfig>) => {
    setConfig({ ...config, scales: config.scales.map((s) => (s.id === id ? { ...s, ...updates } : s)) });
  };

  const handleTestScale = async (scale: ScaleConfig) => {
    if (!scale.ipAddress) {
      setScaleTestResult({ ...scaleTestResult, [scale.id]: { success: false, message: "IP address required" } });
      return;
    }
    setTestingScale(scale.id);
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

  const isScaleSelected = !DEVICES.some((d) => d.key === selected);
  const selectedScale = isScaleSelected ? config.scales.find((s) => s.id === selected) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hardware Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Configure printers, scanners, and peripherals</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={isLoading}
            className="px-5 py-2 bg-[#40721D] text-white rounded-lg text-sm font-medium hover:bg-[#2D5114] disabled:opacity-50 transition-colors">
            {isLoading ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Sidebar + Detail Panel */}
      <div className="flex gap-4 min-h-[500px]">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Devices</p>
          </div>
          <div className="p-2">
            {DEVICES.map((device) => {
              const Icon = device.icon;
              const isActive = selected === device.key;
              return (
                <button key={device.key} onClick={() => setSelected(device.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all mb-0.5 ${
                    isActive
                      ? "bg-[#40721D]/10 text-[#40721D] shadow-sm"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}>
                  <Icon size={16} className={isActive ? "text-[#40721D]" : "text-gray-400"} />
                  <div>
                    <p className={`text-sm font-medium ${isActive ? "text-[#40721D]" : "text-gray-900"}`}>{device.label}</p>
                    <p className="text-[10px] text-gray-400">{device.desc}</p>
                  </div>
                  <span className="ml-auto w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Connected" />
                </button>
              );
            })}

            {/* Scales divider */}
            <div className="mt-3 mb-2 px-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scales</p>
                <button onClick={handleAddScale} className="text-[#40721D] hover:bg-[#40721D]/10 rounded p-0.5" title="Add Scale">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {config.scales.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 italic">No scales configured</div>
            ) : (
              config.scales.map((scale) => {
                const isActive = selected === scale.id;
                return (
                  <button key={scale.id} onClick={() => setSelected(scale.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all mb-0.5 ${
                      isActive ? "bg-[#40721D]/10 text-[#40721D] shadow-sm" : "text-gray-600 hover:bg-gray-50"
                    }`}>
                    <Scale size={16} className={isActive ? "text-[#40721D]" : "text-gray-400"} />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-[#40721D]" : "text-gray-900"}`}>{scale.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{scale.ipAddress || "No IP"}</p>
                    </div>
                    <span className={`ml-auto w-2 h-2 rounded-full flex-shrink-0 ${scale.enabled ? "bg-green-400" : "bg-gray-300"}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Panel Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {isScaleSelected && selectedScale ? selectedScale.name : DEVICES.find((d) => d.key === selected)?.label}
              </h2>
              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Wifi size={10} /> Connected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isScaleSelected && selectedScale && (
                <button onClick={() => handleRemoveScale(selectedScale.id)}
                  className="px-3 py-1.5 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1.5">
                  <Trash2 size={13} /> Remove
                </button>
              )}
              {!isScaleSelected && (
                <button onClick={() => handleTest(selected)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Test Device
                </button>
              )}
              {isScaleSelected && selectedScale && (
                <button onClick={() => handleTestScale(selectedScale)}
                  disabled={testingScale === selectedScale.id || !selectedScale.ipAddress}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                  {testingScale === selectedScale.id ? "Testing..." : "Test Connection"}
                </button>
              )}
            </div>
          </div>

          {/* Panel Body */}
          <div className="p-6">
            {/* Scale test result */}
            {isScaleSelected && selectedScale && scaleTestResult[selectedScale.id]?.message && (
              <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${
                scaleTestResult[selectedScale.id].success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {scaleTestResult[selectedScale.id].message}
              </div>
            )}

            {/* Label Printer Config */}
            {selected === "labelPrinter" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Printer Name</label>
                  <input type="text" value={config.labelPrinter.name} placeholder="e.g., Zebra ZP500"
                    onChange={(e) => setConfig({ ...config, labelPrinter: { ...config.labelPrinter, name: e.target.value } })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Paper Size</label>
                  <select value={config.labelPrinter.paperSize}
                    onChange={(e) => setConfig({ ...config, labelPrinter: { ...config.labelPrinter, paperSize: e.target.value as "4x2.5" | "4x6" } })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
                    <option value="4x6">4x6 inches</option>
                    <option value="4x2.5">4x2.5 inches</option>
                  </select>
                </div>
              </div>
            )}

            {/* Receipt Printer Config */}
            {selected === "receiptPrinter" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Printer Name</label>
                  <input type="text" value={config.receiptPrinter.name} placeholder="e.g., Star Micronics TSP100"
                    onChange={(e) => setConfig({ ...config, receiptPrinter: { ...config.receiptPrinter, name: e.target.value } })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Paper Width</label>
                  <select value={config.receiptPrinter.paperWidth}
                    onChange={(e) => setConfig({ ...config, receiptPrinter: { ...config.receiptPrinter, paperWidth: e.target.value as "2" | "3" | "4" } })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
                    <option value="2">2 inches</option>
                    <option value="3">3 inches</option>
                    <option value="4">4 inches</option>
                  </select>
                </div>
              </div>
            )}

            {/* Barcode Scanner Config */}
            {selected === "barcodeScanner" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Connection Type</label>
                  <select value={config.barcodeScanner.type}
                    onChange={(e) => setConfig({ ...config, barcodeScanner: { ...config.barcodeScanner, type: e.target.value as "USB" | "Bluetooth" } })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
                    <option value="USB">USB</option>
                    <option value="Bluetooth">Bluetooth</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Device Name</label>
                  <input type="text" value={config.barcodeScanner.name || ""} placeholder="e.g., Honeywell HF680"
                    onChange={(e) => setConfig({ ...config, barcodeScanner: { ...config.barcodeScanner, name: e.target.value } })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none" />
                </div>
              </div>
            )}

            {/* Cash Drawer Config */}
            {selected === "cashDrawer" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Connection Type</label>
                  <select value={config.cashDrawer.type}
                    onChange={(e) => setConfig({ ...config, cashDrawer: { ...config.cashDrawer, type: e.target.value as "Serial" | "Network" | "USB" } })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
                    <option value="Serial">Serial</option>
                    <option value="Network">Network</option>
                    <option value="USB">USB</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Device Name/Port</label>
                  <input type="text" value={config.cashDrawer.name || ""} placeholder="e.g., COM1 or /dev/ttyUSB0"
                    onChange={(e) => setConfig({ ...config, cashDrawer: { ...config.cashDrawer, name: e.target.value } })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none" />
                </div>
              </div>
            )}

            {/* Scale Config */}
            {isScaleSelected && selectedScale && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Scale Name</label>
                    <input type="text" value={selectedScale.name} placeholder="e.g., Compounding Station 1"
                      onChange={(e) => handleUpdateScale(selectedScale.id, { name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                    <select value={selectedScale.model}
                      onChange={(e) => handleUpdateScale(selectedScale.id, { model: e.target.value as ScaleConfig["model"] })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
                      <option value="Ohaus Scout">Ohaus Scout</option>
                      <option value="Ohaus Explorer">Ohaus Explorer</option>
                      <option value="Ohaus Adventurer">Ohaus Adventurer</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">IP Address</label>
                    <input type="text" value={selectedScale.ipAddress} placeholder="192.168.1.50"
                      onChange={(e) => handleUpdateScale(selectedScale.id, { ipAddress: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Port</label>
                    <input type="number" value={selectedScale.port}
                      onChange={(e) => handleUpdateScale(selectedScale.id, { port: parseInt(e.target.value) || 9100 })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Weight Unit</label>
                    <select value={selectedScale.unit}
                      onChange={(e) => handleUpdateScale(selectedScale.id, { unit: e.target.value as ScaleConfig["unit"] })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none">
                      <option value="g">Grams (g)</option>
                      <option value="mg">Milligrams (mg)</option>
                      <option value="oz">Ounces (oz)</option>
                      <option value="lb">Pounds (lb)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={selectedScale.enabled}
                      onChange={(e) => handleUpdateScale(selectedScale.id, { enabled: e.target.checked })}
                      className="rounded border-gray-300 text-[#40721D] focus:ring-[#40721D] w-4 h-4" />
                    <span className="text-sm font-medium text-gray-700">Enabled</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
