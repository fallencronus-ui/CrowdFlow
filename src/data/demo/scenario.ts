import type {
  CrowdState,
  DemoPhase,
  EventState,
  RiskLevel,
  Zone,
} from "@/types/crowd";
import type { Prediction, RootCauseAnalysis, ForecastPoint } from "@/types/prediction";
import type { Intervention, SimulationResult } from "@/types/intervention";
import { demoEvent, demoVenue, SIM_START_SECONDS_OF_DAY } from "./venue";

type Key = [number, number];

interface ZoneProfile {
  id: string;
  keys: Key[];
  criticalThreshold: number;
  riskBias: number;
  /** multiplier ramp applied once the intervention is live */
  interventionFactor: number;
  peoplePerPercent?: number;
}

const PROFILES: ZoneProfile[] = [
  {
    id: "corridor-c",
    keys: [
      [0, 0.34],
      [120, 0.5],
      [194, 0.62],
      [280, 0.8],
      [332, 0.94],
      [420, 0.96],
      [480, 0.92],
    ],
    criticalThreshold: 0.75,
    riskBias: 0,
    interventionFactor: 0.713,
  },
  {
    id: "gate-a",
    keys: [
      [0, 0.44],
      [120, 0.58],
      [194, 0.68],
      [300, 0.84],
      [420, 0.8],
      [480, 0.74],
    ],
    criticalThreshold: 0.8,
    riskBias: -13,
    interventionFactor: 0.88,
  },
  {
    id: "food-7",
    keys: [
      [0, 0.4],
      [194, 0.59],
      [300, 0.74],
      [420, 0.78],
      [480, 0.72],
    ],
    criticalThreshold: 0.7,
    riskBias: -17,
    interventionFactor: 0.7,
  },
  {
    id: "exit-e",
    keys: [
      [0, 0.22],
      [194, 0.42],
      [300, 0.55],
      [420, 0.61],
      [480, 0.64],
    ],
    criticalThreshold: 0.75,
    riskBias: -16,
    interventionFactor: 1.18,
  },
  {
    id: "exit-d",
    keys: [
      [0, 0.12],
      [194, 0.2],
      [300, 0.26],
      [480, 0.3],
    ],
    criticalThreshold: 0.85,
    riskBias: -4,
    interventionFactor: 1.9,
  },
  {
    id: "corridor-d",
    keys: [
      [0, 0.1],
      [194, 0.18],
      [300, 0.22],
      [480, 0.28],
    ],
    criticalThreshold: 0.85,
    riskBias: -2,
    interventionFactor: 1.6,
  },
  {
    id: "gate-b",
    keys: [
      [0, 0.14],
      [194, 0.24],
      [480, 0.34],
    ],
    criticalThreshold: 0.85,
    riskBias: -6,
    interventionFactor: 1.35,
  },
  {
    id: "sections-3-5",
    keys: [
      [0, 0.94],
      [194, 0.86],
      [300, 0.64],
      [480, 0.3],
    ],
    criticalThreshold: 0.98,
    riskBias: -34,
    interventionFactor: 0.94,
  },
  {
    id: "north-stand",
    keys: [
      [0, 0.93],
      [194, 0.88],
      [480, 0.42],
    ],
    criticalThreshold: 0.98,
    riskBias: -38,
    interventionFactor: 1,
  },
  {
    id: "south-stand",
    keys: [
      [0, 0.92],
      [194, 0.87],
      [480, 0.46],
    ],
    criticalThreshold: 0.98,
    riskBias: -36,
    interventionFactor: 1,
  },
  {
    id: "west-concourse",
    keys: [
      [0, 0.3],
      [194, 0.46],
      [300, 0.58],
      [480, 0.6],
    ],
    criticalThreshold: 0.8,
    riskBias: -20,
    interventionFactor: 0.86,
  },
];

const PROFILE_BY_ID = new Map(PROFILES.map((p) => [p.id, p]));

export const HORIZON_SECONDS = 138;

function interp(keys: Key[], t: number): number {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) return 0;
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (!a || !b) continue;
    if (t >= a[0] && t <= b[0]) {
      const k = (t - a[0]) / (b[0] - a[0]);
      const eased = k * k * (3 - 2 * k);
      return a[1] + (b[1] - a[1]) * eased;
    }
  }
  return last[1];
}

/** ramps 0 → 1 over 24s once the intervention is applied */
function mitigationRamp(t: number, appliedAt: number | null): number {
  if (appliedAt === null || t < appliedAt) return 0;
  return Math.min(1, (t - appliedAt) / 24);
}

export function occupancyAt(
  zoneId: string,
  t: number,
  appliedAt: number | null = null,
): number {
  const profile = PROFILE_BY_ID.get(zoneId);
  if (!profile) return 0;
  const raw = interp(profile.keys, t);
  const ramp = mitigationRamp(t, appliedAt);
  const factor = 1 + (profile.interventionFactor - 1) * ramp;
  return Math.max(0.02, Math.min(1.02, raw * factor));
}

export function criticalThreshold(zoneId: string): number {
  return PROFILE_BY_ID.get(zoneId)?.criticalThreshold ?? 0.8;
}

function growthPerMinute(zoneId: string, t: number, appliedAt: number | null): number {
  const a = occupancyAt(zoneId, t, appliedAt);
  const b = occupancyAt(zoneId, t + 60, appliedAt);
  return b - a;
}

export function riskScoreFor(zoneId: string, t: number, appliedAt: number | null): number {
  const profile = PROFILE_BY_ID.get(zoneId);
  if (!profile) return 0;
  const current = occupancyAt(zoneId, t, appliedAt);
  const predicted = occupancyAt(zoneId, t + HORIZON_SECONDS, appliedAt);
  const growth = growthPerMinute(zoneId, t, appliedAt);
  const base =
    0.75 * predicted * 100 +
    0.25 * current * 100 +
    growth * 100 * 0.35 -
    (profile.criticalThreshold - 0.75) * 60 +
    profile.riskBias;
  return Math.max(2, Math.min(100, Math.round(base)));
}

export function levelFromScore(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

export function timeToCritical(
  zoneId: string,
  t: number,
  appliedAt: number | null,
): number | null {
  const threshold = criticalThreshold(zoneId);
  if (occupancyAt(zoneId, t, appliedAt) >= threshold) return 0;
  for (let dt = 6; dt <= 600; dt += 6) {
    if (occupancyAt(zoneId, t + dt, appliedAt) >= threshold) return dt;
  }
  return null;
}

export function formatClock(simSecond: number): string {
  const total = (SIM_START_SECONDS_OF_DAY + Math.floor(simSecond)) % 86400;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds <= 0) return "NOW";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function phaseAt(t: number, appliedAt: number | null): DemoPhase {
  if (appliedAt !== null && t >= appliedAt) return "MITIGATED";
  const score = riskScoreFor("corridor-c", t, appliedAt);
  if (score >= 80) return "CRITICAL";
  if (score >= 62) return "PREDICTION";
  if (t >= 90) return "BUILD_UP";
  if (t >= 40) return "ENTRY";
  return "NORMAL";
}

function eventStateAt(t: number): EventState {
  if (t >= 360) return "EXIT_SURGE";
  return "ENDING_SOON";
}

export function buildZones(t: number, appliedAt: number | null): Zone[] {
  return demoVenue.zones.map((def) => {
    const occ = occupancyAt(def.id, t, appliedAt);
    const growth = growthPerMinute(def.id, t, appliedAt);
    const score = riskScoreFor(def.id, t, appliedAt);
    const currentOccupancy = Math.round(occ * def.capacity);
    return {
      id: def.id,
      name: def.name,
      shortName: def.shortName,
      kind: def.kind,
      capacity: def.capacity,
      area: def.area,
      currentOccupancy,
      occupancyPercent: occ,
      density: Number((currentOccupancy / def.area).toFixed(2)),
      inflow: Math.round(Math.max(0, growth) * def.capacity),
      outflow: Math.round(Math.max(0, -growth) * def.capacity),
      growthRate: growth,
      riskScore: score,
      riskLevel: levelFromScore(score),
    } satisfies Zone;
  });
}

export function buildCrowdState(t: number, appliedAt: number | null): CrowdState {
  const zones = buildZones(t, appliedAt);
  const attendees = demoEvent.attendees;
  const remaining = Math.round(28460 - Math.max(0, t - 180) * 9.5);
  const currentCrowd = Math.max(9000, remaining);
  return {
    simSecond: t,
    clock: formatClock(t),
    phase: phaseAt(t, appliedAt),
    eventState: eventStateAt(t),
    totalAttendees: attendees,
    currentCrowd,
    venueUtilization: currentCrowd / attendees,
    secondsToEventEnd: Math.max(0, 360 - t),
    exitSurgeLevel: t > 120 ? "HIGH" : "MODERATE",
    zones,
    reports: {
      reports: Math.min(9, 2 + Math.floor(t / 55)),
      cctvConfidence: 0.82,
      simulationConfidence: 0.91,
      historicalConfidence: "HIGH",
    },
    health: {
      crowdState: true,
      predictionEngine: true,
      riskEngine: true,
      digitalTwin: true,
    },
    interventionApplied: appliedAt !== null && t >= appliedAt,
  };
}

function buildForecast(zoneId: string, t: number, appliedAt: number | null): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  for (let off = -180; off <= 0; off += 60) {
    points.push({
      offsetSeconds: off,
      label: off === 0 ? "NOW" : `${off / 60}m`,
      observed: occupancyAt(zoneId, t + off, appliedAt),
      predicted: off === 0 ? occupancyAt(zoneId, t, appliedAt) : null,
    });
  }
  for (let off = 60; off <= 240; off += 60) {
    points.push({
      offsetSeconds: off,
      label: `+${off / 60}m`,
      observed: null,
      predicted: occupancyAt(zoneId, t + off, appliedAt),
    });
  }
  return points;
}

export function buildPredictions(t: number, appliedAt: number | null): Prediction[] {
  return demoVenue.zones
    .filter((z) => z.kind !== "SEATING")
    .map((def) => {
      const score = riskScoreFor(def.id, t, appliedAt);
      return {
        zoneId: def.id,
        zoneName: def.name,
        currentOccupancy: occupancyAt(def.id, t, appliedAt),
        predictedOccupancy: occupancyAt(def.id, t + HORIZON_SECONDS, appliedAt),
        capacityThreshold: criticalThreshold(def.id),
        horizonMinutes: HORIZON_SECONDS / 60,
        timeToCritical: timeToCritical(def.id, t, appliedAt),
        growthRate: growthPerMinute(def.id, t, appliedAt),
        confidence: def.id === "corridor-c" ? 0.91 : 0.78 + (def.id.length % 5) / 100,
        riskLevel: levelFromScore(score),
        riskScore: score,
        forecast: buildForecast(def.id, t, appliedAt),
      } satisfies Prediction;
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

const ROOT_CAUSES: Record<string, RootCauseAnalysis> = {
  "corridor-c": {
    zoneId: "corridor-c",
    zoneName: "Corridor C",
    summary:
      "Primary contributor: concentrated inflow from Gate A into a structurally constrained pedestrian corridor, compounded by exit-surge timing.",
    causes: [
      {
        id: "rc-1",
        factor: "Gate A inflow",
        detail: "Sustained +8%/min inflow funnelling directly into Corridor C.",
        contribution: 24,
        linkedZoneId: "gate-a",
      },
      {
        id: "rc-2",
        factor: "Narrow corridor geometry",
        detail: "3.1 m effective width against 1,200-person throughput demand.",
        contribution: 21,
        linkedZoneId: "corridor-c",
      },
      {
        id: "rc-3",
        factor: "Exit surge timing",
        detail: "Event end at 21:30 releases Sections 3–5 onto a single route.",
        contribution: 18,
        linkedZoneId: "sections-3-5",
      },
      {
        id: "rc-4",
        factor: "Food Counter 7 obstruction",
        detail: "Queue spill reduces usable corridor width by an estimated 22%.",
        contribution: 16,
        linkedZoneId: "food-7",
      },
      {
        id: "rc-5",
        factor: "Historical hotspot",
        detail: "17 recorded high-density incidents at this location.",
        contribution: 12,
        linkedZoneId: "corridor-c",
      },
    ],
  },
};

export function buildRootCause(zoneId: string): RootCauseAnalysis {
  const known = ROOT_CAUSES[zoneId];
  if (known) return known;
  const zone = demoVenue.zones.find((z) => z.id === zoneId);
  return {
    zoneId,
    zoneName: zone?.name ?? zoneId,
    summary:
      "Contributions are distributed across upstream inflow, local geometry and route distribution.",
    causes: [
      { id: "g1", factor: "Upstream inflow", detail: "Adjacent route loading.", contribution: 18 },
      { id: "g2", factor: "Local geometry", detail: "Constrained throughput.", contribution: 14 },
      { id: "g3", factor: "Route distribution", detail: "Unbalanced egress options.", contribution: 11 },
      { id: "g4", factor: "Event phase", detail: "Exit-surge proximity.", contribution: 9 },
    ],
  };
}

export const INTERVENTIONS: Intervention[] = [
  {
    id: "iv-redirect-35-exit-d",
    action: "Redirect Sections 3–5 → Exit D",
    type: "REROUTE",
    priority: 1,
    expectedEffect: "−18% Corridor C inflow",
    effectPoints: 18,
    confidence: 0.91,
    targetZoneId: "corridor-c",
  },
  {
    id: "iv-staff",
    action: "Deploy 2 staff members to Corridor C",
    type: "STAFFING",
    priority: 2,
    expectedEffect: "Improved flow control and lane discipline",
    effectPoints: 5,
    confidence: 0.78,
    targetZoneId: "corridor-c",
  },
  {
    id: "iv-food-7",
    action: "Restrict Food Counter 7 access",
    type: "ACCESS_CONTROL",
    priority: 3,
    expectedEffect: "Remove pedestrian obstruction",
    effectPoints: 6,
    confidence: 0.84,
    targetZoneId: "food-7",
  },
  {
    id: "iv-open-exit-e",
    action: "Open Exit E to full capacity",
    type: "CAPACITY",
    priority: 4,
    expectedEffect: "+1,800 egress capacity on the south route",
    effectPoints: 7,
    confidence: 0.8,
    targetZoneId: "exit-e",
  },
  {
    id: "iv-signage",
    action: "Change dynamic signage to alternate routes",
    type: "SIGNAGE",
    priority: 5,
    expectedEffect: "Softer redistribution of walk-up traffic",
    effectPoints: 3,
    confidence: 0.62,
    targetZoneId: "west-concourse",
  },
  {
    id: "iv-gate-a",
    action: "Redirect Gate A traffic to Gate B",
    type: "REROUTE",
    priority: 6,
    expectedEffect: "−9% upstream inflow into Corridor C",
    effectPoints: 9,
    confidence: 0.74,
    targetZoneId: "gate-a",
  },
];

/** The default recommended package that reproduces the 94% → 67% headline. */
export const RECOMMENDED_INTERVENTION_IDS = [
  "iv-redirect-35-exit-d",
  "iv-staff",
  "iv-food-7",
];

export function simulate(
  interventionIds: string[],
  t: number,
  appliedAt: number | null,
): SimulationResult {
  const before = occupancyAt("corridor-c", t + HORIZON_SECONDS, appliedAt);
  const scoreBefore = riskScoreFor("corridor-c", t, appliedAt);
  const selected = INTERVENTIONS.filter((i) => interventionIds.includes(i.id));
  // diminishing returns on stacked interventions
  const points = selected
    .sort((a, b) => b.effectPoints - a.effectPoints)
    .reduce((acc, iv, index) => acc + iv.effectPoints * Math.pow(0.82, index), 0);
  const after = Math.max(0.22, before - points / 100);
  const scoreAfter = Math.max(
    8,
    Math.round(scoreBefore - points * 1.28 - (selected.length ? 2 : 0)),
  );
  const confidence = selected.length
    ? selected.reduce((a, i) => a + i.confidence, 0) / selected.length
    : 0;
  return {
    zoneId: "corridor-c",
    beforePeakDensity: before,
    afterPeakDensity: after,
    improvementPercentagePoints: Math.round((before - after) * 100),
    improvementPercent: before > 0 ? ((before - after) / before) * 100 : 0,
    riskBefore: levelFromScore(scoreBefore),
    riskAfter: levelFromScore(scoreAfter),
    riskScoreBefore: scoreBefore,
    riskScoreAfter: scoreAfter,
    confidence,
    appliedInterventionIds: interventionIds,
  };
}
