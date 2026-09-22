interface SectionHeadingProps {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export default function SectionHeading({
  label,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div
      style={{
        textAlign: align,
        maxWidth: align === "center" ? "520px" : undefined,
        margin: align === "center" ? "0 auto" : undefined,
        marginBottom: "2.5rem",
      }}
    >
      {label && (
        <p
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--color-text-subtle)",
            marginBottom: "0.5rem",
          }}
        >
          {label}
        </p>
      )}
      <h2
        style={{
          fontSize: "clamp(1.5rem, 3vw, 2rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "var(--color-text)",
          lineHeight: 1.2,
          marginBottom: description ? "0.75rem" : 0,
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--color-text-muted)",
            lineHeight: 1.7,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
