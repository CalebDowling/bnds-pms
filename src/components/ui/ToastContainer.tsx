"use client";

import { useRealtimeToasts, type Toast } from "@/hooks/useRealtimeToast";

const TOAST_STYLES: Record<Toast["type"], string> = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  success: "bg-green-50 border-green-200 text-green-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
};

// SVG icons instead of emojis for consistency and accessibility
const ToastIcon = ({ type }: { type: Toast["type"] }) => {
  if (type === "info") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-blue-600" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
      </svg>
    );
  }
  if (type === "success") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-green-600" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-amber-600" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
  );
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useRealtimeToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="status">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border animate-slide-in ${TOAST_STYLES[toast.type]}`}
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <ToastIcon type={toast.type} />
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-sm opacity-50 hover:opacity-100 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            aria-label="Dismiss notification"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
