# Performance Optimization Examples

Practical examples of how to use the implemented performance optimization features.

---

## Example 1: Dashboard Page with All Optimizations

```tsx
// src/app/dashboard/page.tsx
"use client";

import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { LazyPhoneDialer, LazyBarcodeScanner } from "@/components/lazy";
import { useState } from "react";

interface DashboardData {
  totalCustomers: number;
  totalOrders: number;
  pendingPrescriptions: number;
  revenueToday: number;
}

export default function DashboardPage() {
  const [showScanner, setShowScanner] = useState(false);

  // Fetch dashboard stats with caching + dedup + retry
  const { data, loading, error, refresh } = useOptimizedQuery<DashboardData>(
    "/api/dashboard/stats",
    {
      ttl: 60, // Cache for 1 minute
      maxRetries: 3,
      onError: (err) => console.error("Failed to load dashboard:", err),
    }
  );

  return (
    <div className="space-y-6">
      {/* Header with optimized image */}
      <div className="relative h-32 rounded-lg overflow-hidden">
        <OptimizedImage
          src="/banners/dashboard-hero.jpg"
          alt="Dashboard"
          size="lg"
          priority // Loads immediately
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </>
        ) : error ? (
          <div className="col-span-full text-red-600">
            Error: {error.message}
            <button
              onClick={refresh}
              className="ml-2 text-blue-600 underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <StatCard title="Customers" value={data?.totalCustomers} />
            <StatCard title="Orders" value={data?.totalOrders} />
            <StatCard title="Pending Rx" value={data?.pendingPrescriptions} />
            <StatCard title="Revenue" value={`$${data?.revenueToday}`} />
          </>
        )}
      </div>

      {/* Lazy-loaded Phone Dialer (only loads when rendered) */}
      <LazyPhoneDialer />

      {/* Conditional Lazy-loaded Barcode Scanner */}
      {showScanner && (
        <LazyBarcodeScanner
          onScan={(barcode) => {
            console.log("Scanned:", barcode);
            setShowScanner(false);
          }}
          onError={(err) => console.error("Scan error:", err)}
        />
      )}

      <button
        onClick={() => setShowScanner(!showScanner)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg"
      >
        {showScanner ? "Close Scanner" : "Open Scanner"}
      </button>

      {/* Refresh button */}
      <button
        onClick={refresh}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        disabled={loading}
      >
        {loading ? "Refreshing..." : "Refresh Data"}
      </button>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value?: string | number }) {
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value ?? "-"}</p>
    </div>
  );
}
```

---

## Example 2: Orders List with Pagination & Caching

```tsx
// src/app/orders/page.tsx
"use client";

import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useState } from "react";

interface Order {
  id: string;
  customerName: string;
  amount: number;
  status: "pending" | "completed" | "shipped";
  imageUrl?: string;
  createdAt: string;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);

  // Cache per page (different URLs = different cache entries)
  const { data, loading, error, refresh } = useOptimizedQuery<OrdersResponse>(
    `/api/orders?page=${page}&limit=20`,
    {
      ttl: 120, // Cache for 2 minutes
      maxRetries: 2,
      onSuccess: (data) => console.log(`Loaded page ${data.page}`),
    }
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Orders</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
          <p className="text-red-800">Error: {error.message}</p>
          <button
            onClick={refresh}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Order ID</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : (
              data?.orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-sm">{order.id}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {order.imageUrl && (
                        <OptimizedImage
                          src={order.imageUrl}
                          alt={order.customerName}
                          size="avatar"
                          className="rounded-full"
                        />
                      )}
                      {order.customerName}
                    </div>
                  </td>
                  <td className="p-3 text-right">${order.amount}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        order.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : order.status === "shipped"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <p className="text-gray-600">
          Page {page} of {Math.ceil((data?.total ?? 0) / 20)}
        </p>
        <div className="space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data || page * 20 >= data.total || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <button
        onClick={refresh}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
        disabled={loading}
      >
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}
```

---

## Example 3: Using Direct Cache & Dedup Utilities

```tsx
// src/lib/pharmacy-service.ts
"use client";

import { cache } from "@/lib/cache";
import { dedup } from "@/lib/dedup";

interface PharmacyData {
  name: string;
  address: string;
  phone: string;
  hours: Record<string, string>;
}

/**
 * Fetch pharmacy info with caching and deduplication.
 * Multiple calls within 50ms share the same promise.
 * Result is cached for 5 minutes.
 */
export async function getPharmacyInfo(): Promise<PharmacyData> {
  return dedup("pharmacy-info", async () => {
    // Check cache first
    const cached = cache.get<PharmacyData>("pharmacy-info");
    if (cached) {
      return cached;
    }

    // Fetch from API
    const response = await fetch("/api/pharmacy/info");
    if (!response.ok) {
      throw new Error("Failed to fetch pharmacy info");
    }

    const data = await response.json();

    // Cache for 5 minutes
    cache.set("pharmacy-info", data, 300);

    return data;
  });
}

/**
 * Example: Component using the service
 */
export function PharmacyCard() {
  const [pharmacy, setPharmacy] = React.useState<PharmacyData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    setLoading(true);

    getPharmacyInfo()
      .then(setPharmacy)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading pharmacy info...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold">{pharmacy?.name}</h2>
      <p className="text-gray-600">{pharmacy?.address}</p>
      <p className="text-gray-600">{pharmacy?.phone}</p>
      <div className="mt-4">
        <h3 className="font-semibold">Hours</h3>
        {Object.entries(pharmacy?.hours ?? {}).map(([day, hours]) => (
          <div key={day} className="flex justify-between text-sm">
            <span>{day}</span>
            <span>{hours}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Example 4: Form Submission with Request Deduplication

```tsx
// src/components/PrescriptionForm.tsx
"use client";

import { dedup } from "@/lib/dedup";
import { useState } from "react";

interface PrescriptionFormProps {
  customerId: string;
  onSuccess?: () => void;
}

export function PrescriptionForm({ customerId, onSuccess }: PrescriptionFormProps) {
  const [formData, setFormData] = useState({
    medication: "",
    dosage: "",
    quantity: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Use dedup to prevent double-submits
      // Multiple rapid submissions share the same promise
      const result = await dedup(
        `submit-prescription-${customerId}`,
        () =>
          fetch("/api/prescriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId,
              ...formData,
            }),
          })
            .then((res) => {
              if (!res.ok) throw new Error("Failed to submit");
              return res.json();
            })
      );

      console.log("Prescription submitted:", result);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Medication</label>
        <input
          type="text"
          value={formData.medication}
          onChange={(e) =>
            setFormData({ ...formData, medication: e.target.value })
          }
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Dosage</label>
        <input
          type="text"
          value={formData.dosage}
          onChange={(e) =>
            setFormData({ ...formData, dosage: e.target.value })
          }
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Quantity</label>
        <input
          type="number"
          value={formData.quantity}
          onChange={(e) =>
            setFormData({ ...formData, quantity: e.target.value })
          }
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Prescription"}
      </button>
    </form>
  );
}
```

---

## Example 5: Lazy-loading Modal with Shortcuts

```tsx
// src/app/help/page.tsx
"use client";

import { LazyShortcutsModal } from "@/components/lazy";
import { useState } from "react";

export default function HelpPage() {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Help & Documentation</h1>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Getting Started</h2>
        <p>Welcome to the Pharmacy Management System...</p>

        {/* Button to show shortcuts (loads component on demand) */}
        <button
          onClick={() => setShowShortcuts(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          View Keyboard Shortcuts
        </button>
      </section>

      {/* Lazy-loaded modal only renders when showShortcuts is true */}
      {showShortcuts && (
        <LazyShortcutsModal />
      )}
    </div>
  );
}
```

---

## Example 6: Real-world Combined Optimization

```tsx
// src/app/customers/[id]/profile.tsx
"use client";

import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { dedup } from "@/lib/dedup";
import { cache } from "@/lib/cache";

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  joinDate: string;
  totalOrders: number;
  totalSpent: number;
  prescriptions: Array<{
    id: string;
    medication: string;
    status: string;
    refillsRemaining: number;
  }>;
}

export default function CustomerProfile({ params }: { params: { id: string } }) {
  const { data, loading, error, refresh } = useOptimizedQuery<CustomerProfile>(
    `/api/customers/${params.id}/profile`,
    {
      ttl: 300, // Cache for 5 minutes (profile data doesn't change often)
      maxRetries: 3,
    }
  );

  const handleInvalidateCache = () => {
    // Manually clear cache when customer updates profile
    cache.delete(`/api/customers/${params.id}/profile`);
    refresh();
  };

  const handleRefillPrescription = async (prescriptionId: string) => {
    try {
      // Dedup prevents accidental double-clicks
      await dedup(`refill-${prescriptionId}`, () =>
        fetch(`/api/prescriptions/${prescriptionId}/refill`, {
          method: "POST",
        }).then((res) => {
          if (!res.ok) throw new Error("Refill failed");
          return res.json();
        })
      );

      // Invalidate cache after mutation
      handleInvalidateCache();
    } catch (err) {
      console.error("Refill error:", err);
    }
  };

  if (loading) return <LoadingProfile />;
  if (error)
    return (
      <ErrorProfile error={error} onRetry={refresh} />
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Customer Header */}
      <div className="flex items-center gap-4">
        {data?.avatar && (
          <OptimizedImage
            src={data.avatar}
            alt={data.name}
            size="avatar"
            className="rounded-full"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold">{data?.name}</h1>
          <p className="text-gray-600">Member since {data?.joinDate}</p>
        </div>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold">{data?.totalOrders}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Spent</p>
          <p className="text-2xl font-bold">${data?.totalSpent}</p>
        </div>
      </div>

      {/* Prescriptions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Active Prescriptions</h2>
        <div className="space-y-2">
          {data?.prescriptions.map((rx) => (
            <div key={rx.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{rx.medication}</p>
                  <p className="text-sm text-gray-600">
                    Status: {rx.status}
                  </p>
                  <p className="text-sm text-gray-600">
                    Refills remaining: {rx.refillsRemaining}
                  </p>
                </div>
                {rx.refillsRemaining > 0 && (
                  <button
                    onClick={() => handleRefillPrescription(rx.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    Refill
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={refresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Refresh Profile
        </button>
        <button
          onClick={handleInvalidateCache}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
}

function LoadingProfile() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 bg-gray-200 rounded-full w-12" />
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-20 bg-gray-200 rounded" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

function ErrorProfile({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-700 font-semibold">Error loading profile</p>
      <p className="text-red-600">{error.message}</p>
      <button
        onClick={onRetry}
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
      >
        Try Again
      </button>
    </div>
  );
}
```

---

## Performance Tips

1. **Always use `useOptimizedQuery` for API calls** - gets you caching + dedup + retry for free
2. **Set appropriate TTL** - balance between freshness and performance
3. **Use `LazyBarcodeScanner` conditionally** - only render when needed
4. **Use `OptimizedImage` for all images** - automatic responsive sizing
5. **Monitor bundle size** - run `npm run build` periodically
6. **Test on slow networks** - Chrome DevTools > Throttling

---
