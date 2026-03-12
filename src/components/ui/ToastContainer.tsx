"use client";

import { useRealtimeToasts, type Toast } from "@/hooks/useRealtimeToast";

const TOAST_STYLES: Record<Toast["type"], string> = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  success: "bg-green-50 border-green-200 text-green-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
};

const TOAST_ICONS: Record<Toast["type"], string> = {
  info: "\u2139\uFE0F",
  success: "\u2705",
  warning: "\u26A0\uFE0F",
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useRealtimeToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-2 px-4 py-3 rounded-lg border shadow-lg animate-slide-in ${TOAST_STYLES[toast.type]}`}
        >
          <span className="text-sm flex-shrink-0">{TOAST_ICONS[toast.type]}</span>
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-sm opacity-50 hover:opacity-100 flex-shrink-0"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
