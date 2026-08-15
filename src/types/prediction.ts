import type { RiskLevel } from "./crowd";

export interface ForecastPoint {
  /** offset in seconds from now; negative = observed */
  offsetSeconds: number;
  label: string;
  observed: number | null;
  predicted: number | null;
}

export interface Prediction {
  zoneId: string;
  zoneName: string;
  currentOccupancy: number;
  predictedOccupancy: number;
  capacityThreshold: number;
  horizonMinutes: number;
  /** seconds until the zone crosses the critical threshold; null = not projected */
  timeToCritical: number | null;
  growthRate: number;
  confidence: number;
  riskLevel: RiskLevel;
  riskScore: number;
  forecast: ForecastPoint[];
}

export interface RootCause {
  id: string;
  factor: string;
  detail: string;
  contribution: number;
  linkedZoneId?: string;
}

export interface RootCauseAnalysis {
  zoneId: string;
  zoneName: string;
  causes: RootCause[];
  summary: string;
}
