export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Zone {
  id: string;
  name: string;
  shortName: string;
  kind: string;
  capacity: number;
  area: number;
  currentOccupancy: number;
  occupancyPercent: number;
  /** people per square metre */
  density: number;
  inflow: number;
  outflow: number;
  growthRate: number;
  riskScore: number;
  riskLevel: RiskLevel;
}

export type EventState = "PRE_EVENT" | "ENTRY" | "IN_PROGRESS" | "ENDING_SOON" | "EXIT_SURGE";

export interface CrowdReportSignal {
  reports: number;
  cctvConfidence: number;
  simulationConfidence: number;
  historicalConfidence: "LOW" | "MEDIUM" | "HIGH";
}

export interface SystemHealth {
  crowdState: boolean;
  predictionEngine: boolean;
  riskEngine: boolean;
  digitalTwin: boolean;
}

export type DemoPhase =
  | "NORMAL"
  | "ENTRY"
  | "BUILD_UP"
  | "PREDICTION"
  | "CRITICAL"
  | "MITIGATED";

export interface CrowdState {
  /** seconds since the start of the simulated window */
  simSecond: number;
  clock: string;
  phase: DemoPhase;
  eventState: EventState;
  totalAttendees: number;
  currentCrowd: number;
  venueUtilization: number;
  secondsToEventEnd: number;
  exitSurgeLevel: "LOW" | "MODERATE" | "HIGH";
  zones: Zone[];
  reports: CrowdReportSignal;
  health: SystemHealth;
  interventionApplied: boolean;
}
