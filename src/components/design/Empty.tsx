import * as React from "react";
import { I } from "./Icons";

interface EmptyProps {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  body?: string;
}

export function Empty({ icon: Ic = I.Inventory, title, body }: EmptyProps) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-3)" }}>
      <Ic className="ic-lg" style={{ color: "var(--ink-4)" }} />
      <div style={{ fontWeight: 500, color: "var(--ink-2)", marginTop: 10 }}>{title}</div>
      {body && <div className="t-xs" style={{ marginTop: 4 }}>{body}</div>}
    </div>
  );
}
