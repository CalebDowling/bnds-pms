"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  toast: (message: string, type: ToastType) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Icons as inline SVGs
const IconCheckmark = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconWarning = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const IconInfo = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

function getIcon(type: ToastType) {
  switch (type) {
    case "success":
      return <IconCheckmark />;
    case "error":
      return <IconX />;
    case "warning":
      return <IconWarning />;
    case "info":
      return <IconInfo />;
  }
}

function getStyles(type: ToastType) {
  switch (type) {
    case "success":
      return {
        bg: "bg-green-50 dark:bg-green-900/20",
        border: "border-green-200 dark:border-green-800",
        text: "text-green-800 dark:text-green-200",
        icon: "text-green-600 dark:text-green-400",
      };
    case "error":
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        text: "text-red-800 dark:text-red-200",
        icon: "text-red-600 dark:text-red-400",
      };
    case "warning":
      return {
        bg: "bg-amber-50 dark:bg-amber-900/20",
        border: "border-amber-200 dark:border-amber-800",
        text: "text-amber-800 dark:text-amber-200",
        icon: "text-amber-600 dark:text-amber-400",
      };
    case "info":
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        border: "border-blue-200 dark:border-blue-800",
        text: "text-blue-800 dark:text-blue-200",
        icon: "text-blue-600 dark:text-blue-400",
      };
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newToast: ToastMessage = { id, message, type, timestamp: Date.now() };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 4 seconds
    const timeout = setTimeout(() => {
      dismissToast(id);
    }, 4000);

    return () => clearTimeout(timeout);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismissToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return {
    toast: context.toast,
    toasts: context.toasts,
    dismissToast: context.dismissToast,
  };
}

function ToastContainer() {
  const { toasts, dismissToast } = useContext(ToastContext)!;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const styles = getStyles(t.type);
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slide-in pointer-events-auto ${styles.bg} ${styles.border} ${styles.text}`}
            role="alert"
          >
            <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
              {getIcon(t.type)}
            </div>
            <p className="text-sm flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => dismissToast(t.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <IconX />
            </button>
          </div>
        );
      })}
    </div>
  );
}
