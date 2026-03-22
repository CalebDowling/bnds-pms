'use client';

import React, { useState } from 'react';
import { BarcodeScanner } from '@/components/ui/BarcodeScanner';
import {
  lookupByNDC,
  checkInItem,
  verifyDispensing,
} from './actions';

export const dynamic = 'force-dynamic';

type Mode = 'check-in' | 'verify';

interface ScanResult {
  success: boolean;
  message: string;
  data?: any;
}

export default function InventoryScanPage() {
  const [mode, setMode] = useState<Mode>('check-in');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check-in state
  const [checkinItem, setCheckinItem] = useState<any>(null);
  const [checkinQuantity, setCheckinQuantity] = useState('');
  const [checkinLot, setCheckinLot] = useState('');
  const [checkinExpiry, setCheckinExpiry] = useState('');

  // Verify state
  const [verifyFillId, setVerifyFillId] = useState('');

  const handleScan = async (barcode: string, format: string) => {
    setIsLoading(true);
    setScanResult(null);

    try {
      const item = await lookupByNDC(barcode);

      if (!item) {
        setScanResult({
          success: false,
          message: `No item found for NDC: ${barcode}`,
        });
        setIsLoading(false);
        return;
      }

      if (mode === 'check-in') {
        setCheckinItem({
          id: item.id,
          ndc: barcode,
          name: item.name,
          strength: item.strength,
          manufacturer: item.manufacturer,
        });
        setScanResult({
          success: true,
          message: `Found: ${item.name} (${item.strength})`,
          data: item,
        });
      } else if (mode === 'verify' && verifyFillId) {
        const result = await verifyDispensing(verifyFillId, barcode);
        setScanResult({
          success: result.success,
          message: result.message,
          data: result,
        });
      } else {
        setScanResult({
          success: false,
          message: 'Please enter a fill ID first',
        });
      }
    } catch (error) {
      setScanResult({
        success: false,
        message: error instanceof Error ? error.message : 'Scan failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCheckin = async () => {
    if (!checkinItem || !checkinQuantity) {
      setScanResult({
        success: false,
        message: 'Please fill in all required fields',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await checkInItem(
        checkinItem.id,
        parseFloat(checkinQuantity),
        checkinLot || undefined,
        checkinExpiry || undefined
      );

      setScanResult({
        success: result.success,
        message: result.message,
      });

      if (result.success) {
        setCheckinItem(null);
        setCheckinQuantity('');
        setCheckinLot('');
        setCheckinExpiry('');
      }
    } catch (error) {
      setScanResult({
        success: false,
        message: error instanceof Error ? error.message : 'Check-in failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Scanning</h1>
        <p className="text-gray-600">
          Scan barcodes for inventory check-in and dispensing verification
        </p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-3 bg-white rounded-xl p-4 border border-option-b-border">
        <button
          onClick={() => {
            setMode('check-in');
            setScanResult(null);
            setVerifyFillId('');
          }}
          className={`px-4 py-3 rounded-lg font-medium transition-colors ${
            mode === 'check-in'
              ? 'bg-gradient-to-r from-option-b-light to-option-b-dark text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Check-In
        </button>
        <button
          onClick={() => {
            setMode('verify');
            setScanResult(null);
            setCheckinItem(null);
          }}
          className={`px-4 py-3 rounded-lg font-medium transition-colors ${
            mode === 'verify'
              ? 'bg-gradient-to-r from-option-b-light to-option-b-dark text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Verify
        </button>
      </div>

      {/* Verify Mode - Fill ID Input */}
      {mode === 'verify' && (
        <div className="bg-white rounded-xl p-4 border border-option-b-border space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Fill ID
          </label>
          <input
            type="text"
            value={verifyFillId}
            onChange={(e) => setVerifyFillId(e.target.value)}
            placeholder="Enter fill ID to verify"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      )}

      {/* Scanner */}
      <BarcodeScanner
        onScan={handleScan}
        onError={(error) =>
          setScanResult({
            success: false,
            message: error.message,
          })
        }
        enabled={!isLoading}
      />

      {/* Scan Result */}
      {scanResult && (
        <div
          className={`rounded-xl p-4 border flex items-start gap-3 ${
            scanResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {scanResult.success ? (
            <span className="text-green-600 text-lg flex-shrink-0 mt-0.5">✓</span>
          ) : (
            <span className="text-red-600 text-lg flex-shrink-0 mt-0.5">✕</span>
          )}
          <div className="space-y-2">
            <p
              className={
                scanResult.success ? 'text-green-800' : 'text-red-800'
              }
            >
              {scanResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Check-In Form */}
      {mode === 'check-in' && checkinItem && (
        <div className="bg-white rounded-xl p-4 border border-option-b-border space-y-4">
          <h3 className="font-semibold text-gray-900">Confirm Check-In</h3>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Product
              </label>
              <p className="mt-1 text-gray-900 font-medium">
                {checkinItem.name}
              </p>
              {checkinItem.strength && (
                <p className="text-sm text-gray-600">{checkinItem.strength}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                value={checkinQuantity}
                onChange={(e) => setCheckinQuantity(e.target.value)}
                placeholder="Enter quantity"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lot Number
              </label>
              <input
                type="text"
                value={checkinLot}
                onChange={(e) => setCheckinLot(e.target.value)}
                placeholder="Enter lot number (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date
              </label>
              <input
                type="date"
                value={checkinExpiry}
                onChange={(e) => setCheckinExpiry(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={() => {
                setCheckinItem(null);
                setCheckinQuantity('');
                setCheckinLot('');
                setCheckinExpiry('');
                setScanResult(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCheckin}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Confirm Check-In'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
