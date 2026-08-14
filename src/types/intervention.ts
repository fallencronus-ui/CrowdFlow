import type { RiskLevel } from "./crowd";

export type InterventionType =
  | "REROUTE"
  | "CAPACITY"
  | "STAFFING"
  | "ACCESS_CONTROL"
  | "SIGNAGE";

export interface Intervention {
  id: string;
  action: string;
  type: InterventionType;
  priority: number;
  expectedEffect: string;
  /** modelled reduction in predicted peak density, in percentage points */
  effectPoints: number;
  confidence: number;
  targetZoneId: string;
}

export interface SimulationResult {
  zoneId: string;
  beforePeakDensity: number;
  afterPeakDensity: number;
  improvementPercentagePoints: number;
  improvementPercent: number;
  riskBefore: RiskLevel;
  riskAfter: RiskLevel;
  riskScoreBefore: number;
  riskScoreAfter: number;
  confidence: number;
  appliedInterventionIds: string[];
}
