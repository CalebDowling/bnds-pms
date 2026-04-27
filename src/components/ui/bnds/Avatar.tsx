/**
 * Deterministic colored initials avatar for the BNDS PMS Redesign.
 * Matches the design-reference/screens/_shared.jsx Avatar pattern exactly:
 *   bg: hsl(h, 28%, 88%) — pastel light
 *   fg: hsl(h, 32%, 28%) — same hue, much darker
 * The hue is hashed deterministically from the name so the same patient
 * always gets the same color across all pages.
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
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Match _shared.jsx exactly: h = (h * 31 + charCode) % 360
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const bg = color ?? `hsl(${h}, 28%, 88%)`;
  const fg = color ? "#0f2e1f" : `hsl(${h}, 32%, 28%)`;

  return (
    <div
      aria-label={name}
      className="rounded-full inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: fg,
        fontSize: Math.max(10, size * 0.42),
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
