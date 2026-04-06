'use client';

import React, { useRef, useEffect, useState } from 'react';

interface BarcodeScannerProps {
  onScan: (barcode: string, format: string) => void;
  onError: (error: Error) => void;
  enabled?: boolean;
  compact?: boolean;
}

export function BarcodeScanner({
  onScan,
  onError,
  enabled = true,
  compact = false,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const detectorRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    const initBarcodeDetector = async () => {
      try {
        if ('BarcodeDetector' in window) {
          detectorRef.current = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'data_matrix', 'qr_code'],
          });
        }
      } catch (err) {
        console.warn('BarcodeDetector not available, using manual input only');
      }
    };

    initBarcodeDetector();
  }, [enabled]);

  const startScanning = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
        scanFrames();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError('Camera access denied or unavailable');
      onError(error);
    }
  };

  const scanFrames = async () => {
    if (!isScanning || !videoRef.current || !detectorRef.current) return;

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0);

      const barcodes = await detectorRef.current.detect(canvas);

      if (barcodes && barcodes.length > 0) {
        const barcode = barcodes[0];
        // Vibrate device if available
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
        // Flash effect
        flashGreen();
        onScan(barcode.rawValue, barcode.format);
        stopScanning();
        return;
      }

      requestAnimationFrame(scanFrames);
    } catch (err) {
      console.error('Scan error:', err);
      requestAnimationFrame(scanFrames);
    }
  };

  const flashGreen = () => {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(34, 197, 94, 0.3);
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 150);
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim(), 'manual');
      setManualInput('');
      setIsScanning(false);
    }
  };

  if (compact && !isScanning) {
    return (
      <button
        onClick={startScanning}
        disabled={!enabled}
        className="p-2 rounded-lg bg-option-b-light hover:bg-option-b-dark transition-colors disabled:opacity-50"
        title="Open barcode scanner"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-option-b-border bg-white p-4 space-y-4">
      {isScanning ? (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-48 h-48 border-2 border-green-500 rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-green-500" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-green-500" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-green-500" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-500" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={stopScanning}
              className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              ✕ Cancel
            </button>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Enter barcode manually:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Scan or type barcode"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualInput.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <span className="text-lg flex-shrink-0">⚠</span>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            onClick={startScanning}
            disabled={!enabled || !detectorRef.current}
            className="w-full px-4 py-2 bg-gradient-to-r from-option-b-light to-option-b-dark text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
          >
            Start Scanning
          </button>

          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Or enter barcode manually:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Type barcode"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualInput.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
