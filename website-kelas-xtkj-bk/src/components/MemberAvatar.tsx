interface MemberAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

function getInitials(name: string): string {
  const cleaned = name.replace(/\[.*?\]/g, "").trim();
  if (!cleaned) return "?";
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

// Deterministic color from name — avoids random
function getAvatarColor(name: string): string {
  const palette = [
    { bg: "#dbeafe", text: "#1e40af" },
    { bg: "#dcfce7", text: "#166534" },
    { bg: "#fef3c7", text: "#92400e" },
    { bg: "#fce7f3", text: "#9d174d" },
    { bg: "#ede9fe", text: "#5b21b6" },
    { bg: "#ffedd5", text: "#9a3412" },
    { bg: "#e0f2fe", text: "#075985" },
    { bg: "#f0fdf4", text: "#14532d" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0x7fffffff;
  }
  return JSON.stringify(palette[hash % palette.length]);
}

const sizeMap = {
  sm: 32,
  md: 44,
  lg: 64,
  xl: 88,
};

const fontSizeMap = {
  sm: "0.7rem",
  md: "0.9rem",
  lg: "1.25rem",
  xl: "1.75rem",
};

export default function MemberAvatar({
  name,
  size = "md",
  className = "",
}: MemberAvatarProps) {
  const initials = getInitials(name);
  const colorJSON = getAvatarColor(name);
  const color = JSON.parse(colorJSON) as { bg: string; text: string };
  const px = sizeMap[size];
  const fs = fontSizeMap[size];

  return (
    <span
      className={className}
      role="img"
      aria-label={name}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: px,
        height: px,
        borderRadius: "50%",
        background: color.bg,
        color: color.text,
        fontSize: fs,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        userSelect: "none",
        flexShrink: 0,
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {initials}
    </span>
  );
}
