// Konstanta struktur kelas — dipisah dari route file (Next.js melarang
// ekspor non-handler dari route.ts)
export const STRUCTURE_TIERS = [
  "teacher",
  "leader",
  "deputy",
  "secretary",
  "treasurer",
  "section",
] as const;

export type StructureTier = (typeof STRUCTURE_TIERS)[number];
