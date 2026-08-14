export interface Incident {
  id: string;
  zoneId: string;
  zoneName: string;
  /** Human label for when it happened: a date (demo) or an observation window (backend). */
  date: string;
  eventName: string;
  peakDensity: number;
  durationMinutes: number;
  /** Overrides the minute display when the source has no wall-clock duration. */
  durationLabel?: string;
  trigger: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface HotspotStat {
  zoneId: string;
  zoneName: string;
  incidents: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
  /** null when the source does not report it */
  exitSurgeShare: number | null;
  averageDurationMinutes: number | null;
  averageDurationLabel?: string;
  primaryInflowSource: string | null;
  frequentObstruction: string | null;
  trend: Array<{ period: string; incidents: number }>;
  infrastructureRisk: "LOW" | "MEDIUM" | "HIGH";
  /** label describing the counting unit, e.g. "high-density observations" */
  unitLabel?: string;
}

export interface InfrastructureRecommendation {
  id: string;
  zoneId: string;
  title: string;
  rationale: string;
  impact: "MEDIUM" | "MEDIUM-HIGH" | "HIGH";
  effort: "LOW" | "MEDIUM" | "HIGH";
  factors: string[];
}
