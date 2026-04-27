import * as React from "react";

type Tone = "ok" | "warn" | "danger" | "info" | "mute";

interface StatusPillProps {
  tone?: Tone;
  label: React.ReactNode;
  dot?: boolean;
}

const PILL_CLASS: Record<Tone, string> = {
  ok: "pill-leaf",
  warn: "pill-warn",
  danger: "pill-danger",
  info: "pill-info",
  mute: "pill-mute",
};

const DOT_CLASS: Partial<Record<Tone, string>> = {
  ok: "dot-ok",
  warn: "dot-warn",
  danger: "dot-danger",
  info: "dot-info",
};

export function StatusPill({ tone = "mute", label, dot = true }: StatusPillProps) {
  const cls = PILL_CLASS[tone] ?? "";
  const dotCls = DOT_CLASS[tone];
  return (
    <span className={`pill ${cls}`}>
      {dot && dotCls && <span className={`dot ${dotCls}`} />}
      {label}
    </span>
  );
}
