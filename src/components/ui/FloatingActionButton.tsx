"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  UserPlus,
  FileText,
  ScanLine,
  ShoppingCart,
} from "lucide-react";

const FAB_ITEMS = [
  { label: "New Rx", href: "/prescriptions/new", icon: FileText, color: "#3b82f6" },
  { label: "New Patient", href: "/patients/new", icon: UserPlus, color: "#10b981" },
  { label: "Scan", href: "/inventory/scan", icon: ScanLine, color: "#a855f7" },
  { label: "POS", href: "/pos", icon: ShoppingCart, color: "#f59e0b" },
];

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="fab-container" ref={containerRef}>
      <AnimatePresence>
        {open && (
          <div className="fab-menu">
            {FAB_ITEMS.map((item, i) => (
              <motion.div
                key={item.label}
                className="fab-menu-item"
                initial={{ opacity: 0, y: 12, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.8 }}
                transition={{ delay: i * 0.05, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="fab-menu-item-label">{item.label}</span>
                <button
                  className="fab-menu-item-btn"
                  style={{ background: item.color }}
                  onClick={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                  aria-label={item.label}
                >
                  <item.icon size={20} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.button
        className={`fab-button ${open ? "fab-open" : ""}`}
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.92 }}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}
