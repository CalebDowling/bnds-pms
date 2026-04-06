"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import ShortcutsModal from "@/components/ui/ShortcutsModal";

export interface ShortcutDefinition {
  key: string;
  description: string;
  category: "Navigation" | "Actions" | "System";
  keyCombination: string;
}

interface KeyboardShortcutsContextType {
  registerShortcut: (definition: ShortcutDefinition) => void;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
  shortcuts: ShortcutDefinition[];
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null);

const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  {
    key: "ctrl-k",
    keyCombination: "Ctrl+K / Cmd+K",
    description: "Focus search bar",
    category: "System",
  },
  {
    key: "ctrl-n",
    keyCombination: "Ctrl+N / Cmd+N",
    description: "New Prescription",
    category: "Actions",
  },
  {
    key: "p",
    keyCombination: "P",
    description: "New Patient",
    category: "Actions",
  },
  {
    key: "n",
    keyCombination: "N",
    description: "New Rx",
    category: "Actions",
  },
  {
    key: "b",
    keyCombination: "B",
    description: "Batch Manager",
    category: "Navigation",
  },
  {
    key: "s",
    keyCombination: "S",
    description: "Point of Sale",
    category: "Navigation",
  },
  {
    key: "f",
    keyCombination: "F",
    description: "Find Patient",
    category: "System",
  },
  {
    key: "question",
    keyCombination: "?",
    description: "Show keyboard shortcuts help",
    category: "System",
  },
  {
    key: "escape",
    keyCombination: "Escape",
    description: "Close modal/dropdown",
    category: "System",
  },
];

function isInputElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    (element as HTMLElement).contentEditable === "true"
  );
}

export function KeyboardShortcutsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>(
    DEFAULT_SHORTCUTS
  );

  const registerShortcut = useCallback((definition: ShortcutDefinition) => {
    setShortcuts((prev) => {
      // Avoid duplicates
      if (prev.some((s) => s.key === definition.key)) {
        return prev;
      }
      return [...prev, definition];
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Element;

      // Don't trigger shortcuts when typing in input/textarea/select
      if (isInputElement(target)) {
        // Exception: Escape key always works
        if (e.key === "Escape") {
          setShowHelp(false);
          return;
        }
        return;
      }

      // Handle shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        // Focus search bar - already handled by DashboardSearch
      } else if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        router.push("/prescriptions/new");
      } else if (e.key === "p" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        router.push("/patients/new");
      } else if (e.key === "n" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        router.push("/prescriptions/new");
      } else if (e.key === "b" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        router.push("/compounding");
      } else if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        router.push("/pos");
      } else if (e.key === "f" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // Focus search bar
        const searchInput = document.querySelector(
          'input[placeholder*="Search"]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      } else if (e.key === "?") {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      } else if (e.key === "Escape") {
        setShowHelp(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{ registerShortcut, showHelp, setShowHelp, shortcuts }}
    >
      {children}
      <ShortcutsModal />
    </KeyboardShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      "useShortcuts must be used within KeyboardShortcutsProvider"
    );
  }
  return context;
}
