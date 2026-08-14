import type { RiskLevel } from "@/types/crowd";

/** Canvas rendering cannot read Tailwind classes; these mirror the CSS tokens. */
export const PALETTE = {
  safe: "#3ecf8e",
  moderate: "#e8c24a",
  high: "#f08a3c",
  critical: "#e5484d",
  info: "#4cc2f1",
  grid: "rgba(148, 163, 184, 0.09)",
  structure: "#2b3340",
  structureLine: "#3c485a",
  turf: "#16211c",
  text: "#e6ebf2",
  dim: "#8b97a8",
} as const;

export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "CRITICAL":
      return PALETTE.critical;
    case "HIGH":
      return PALETTE.high;
    case "MEDIUM":
      return PALETTE.moderate;
    default:
      return PALETTE.safe;
  }
}

export function densityColor(pct: number): string {
  if (pct >= 0.8) return PALETTE.critical;
  if (pct >= 0.62) return PALETTE.high;
  if (pct >= 0.45) return PALETTE.moderate;
  return PALETTE.safe;
}

export function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const riskTextClass: Record<RiskLevel, string> = {
  LOW: "text-safe",
  MEDIUM: "text-moderate",
  HIGH: "text-high",
  CRITICAL: "text-critical",
};

export const riskBgClass: Record<RiskLevel, string> = {
  LOW: "bg-safe/12 text-safe border-safe/35",
  MEDIUM: "bg-moderate/12 text-moderate border-moderate/35",
  HIGH: "bg-high/12 text-high border-high/35",
  CRITICAL: "bg-critical/15 text-critical border-critical/45",
};
