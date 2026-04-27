"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<
  Variant,
  { bg: string; color: string; border: string; hoverBg: string }
> = {
  primary: {
    bg: "#1f5a3a",
    color: "#ffffff",
    border: "1px solid #1f5a3a",
    hoverBg: "#174530",
  },
  secondary: {
    bg: "#ffffff",
    color: "#0f2e1f",
    border: "1px solid #d9d2c2",
    hoverBg: "#f5f0e6",
  },
  ghost: {
    bg: "transparent",
    color: "#3a4a3c",
    border: "1px solid transparent",
    hoverBg: "rgba(15, 46, 31, 0.05)",
  },
  danger: {
    bg: "#b83a2f",
    color: "#ffffff",
    border: "1px solid #b83a2f",
    hoverBg: "#9a2c1f",
  },
};

const SIZE: Record<Size, { padding: string; fontSize: number; height: number }> = {
  sm: { padding: "5px 10px", fontSize: 12, height: 28 },
  md: { padding: "7px 13px", fontSize: 13, height: 34 },
  lg: { padding: "10px 18px", fontSize: 14, height: 42 },
};

interface BndsButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

/**
 * Brand button matching the BNDS PMS Redesign — flat forest primary, paper secondary, ghost.
 */
export function BndsButton({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  children,
  className,
  style,
  ...rest
}: BndsButtonProps) {
  const v = VARIANT[variant];
  const s = SIZE[size];
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold transition-colors no-underline ${className ?? ""}`}
      style={{
        backgroundColor: v.bg,
        color: v.color,
        border: v.border,
        padding: s.padding,
        fontSize: s.fontSize,
        cursor: rest.disabled ? "not-allowed" : "pointer",
        opacity: rest.disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!rest.disabled) {
          (e.currentTarget as HTMLElement).style.backgroundColor = v.hoverBg;
        }
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!rest.disabled) {
          (e.currentTarget as HTMLElement).style.backgroundColor = v.bg;
        }
        rest.onMouseLeave?.(e);
      }}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

export default BndsButton;
