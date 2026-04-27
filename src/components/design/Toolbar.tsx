"use client";

import * as React from "react";
import { I } from "./Icons";

export interface ToolbarTab {
  id: string;
  label: string;
  count?: number;
}

export interface ToolbarFilter {
  label: string;
  value?: string;
  active?: boolean;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface ToolbarProps {
  tabs?: ToolbarTab[];
  active?: string;
  onChange?: (id: string) => void;
  right?: React.ReactNode;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: ToolbarFilter[];
}

export function Toolbar({
  tabs,
  active,
  onChange,
  right,
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
}: ToolbarProps) {
  const activeId = active ?? (tabs && tabs.length > 0 ? tabs[0].id : undefined);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
      {tabs && (
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: 3,
            background: "var(--paper-2)",
            borderRadius: 8,
            border: "1px solid var(--line)",
          }}
        >
          {tabs.map((t) => {
            const isActive = activeId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange && onChange(t.id)}
                style={{
                  padding: "6px 12px",
                  fontSize: 12.5,
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? "var(--surface)" : "transparent",
                  color: isActive ? "var(--ink)" : "var(--ink-3)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  boxShadow: isActive ? "var(--shadow-1)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "inherit",
                }}
              >
                {t.label}
                {t.count != null && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: "0 5px",
                      borderRadius: 999,
                      background: isActive ? "var(--paper-2)" : "transparent",
                      color: "var(--ink-3)",
                      fontWeight: 500,
                    }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {search != null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 11px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            minWidth: 220,
            flex: "0 1 320px",
          }}
        >
          <I.Search className="ic-sm" style={{ color: "var(--ink-3)" }} />
          <input
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder || "Search…"}
            style={{
              border: 0,
              outline: 0,
              background: "transparent",
              flex: 1,
              fontSize: 13,
              fontFamily: "inherit",
              color: "var(--ink)",
            }}
          />
        </div>
      )}
      {filters &&
        filters.map((f, i) => {
          const Icon = f.icon ?? I.Filter;
          return (
            <button
              key={i}
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ borderStyle: f.active ? "solid" : "dashed" }}
            >
              <Icon className="ic-sm" />
              {f.label}
              {f.value && <span style={{ color: "var(--ink-3)", marginLeft: 2 }}>· {f.value}</span>}
            </button>
          );
        })}
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}
