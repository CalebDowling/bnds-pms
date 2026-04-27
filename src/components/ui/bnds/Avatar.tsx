"use client";

/**
 * Deterministic colored initials avatar for the BNDS PMS Redesign.
 * Matches the _shared.jsx Avatar pattern.
 */
export function Avatar({
  name,
  size = 32,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Hash to a hue in the heritage palette range (forest, leaf, ochre, terra)
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const palette = [
    "#1f5a3a", // forest
    "#3a6a4f", // dim forest
    "#5aa845", // leaf
    "#2b6c9b", // info blue
    "#7a8a78", // sage
    "#c98a14", // ochre
    "#9c4a25", // terra
    "#174530", // forest deep
  ];
  const bg = color ?? palette[Math.abs(hash) % palette.length];

  return (
    <div
      aria-label={name}
      className="rounded-full inline-flex items-center justify-center text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: Math.max(10, size * 0.36),
        fontWeight: 600,
        letterSpacing: "0.02em",
        fontFamily:
          "var(--font-inter), 'Inter Tight', Inter, system-ui, sans-serif",
      }}
    >
      {initials || "?"}
    </div>
  );
}

export default Avatar;
