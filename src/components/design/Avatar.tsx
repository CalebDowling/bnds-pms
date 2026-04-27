import * as React from "react";

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 28 }: AvatarProps) {
  const safeName = name || "?";
  const initials = safeName
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Deterministic hue from name characters
  let h = 0;
  for (let i = 0; i < safeName.length; i++) {
    h = (h * 31 + safeName.charCodeAt(i)) % 360;
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: `hsl(${h}, 28%, 88%)`,
        color: `hsl(${h}, 32%, 28%)`,
        fontSize: size * 0.42,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
