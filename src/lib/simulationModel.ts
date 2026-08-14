import type { RiskLevel, Zone } from "@/types/crowd";
import type { Prediction } from "@/types/prediction";

/**
 * Transparent scenario model for intervention testing.
 *
 * This is NOT a physics engine and never claims measured reality: it projects
 * the CURRENT state forward with explicit, displayed assumptions:
 *
 *   projected people = current people + (inflow·(1−divert) − outflow·(1+boost)) · horizon
 *
 * The baseline always comes from the live state of the selected data source
 * (demo scenario or backend), never from hard-coded numbers.
 */

export type InterventionType =
  | "REROUTE"
  | "CAPACITY"
  | "STAFFING"
  | "ACCESS_CONTROL"
  | "OBSTRUCTION";

export interface InterventionOption {
  id: string;
  action: string;
  type: InterventionType;
  priority: number;
  /** share of inflow diverted away from the target zone (0-1) */
  divertInflow: number;
  /** proportional increase of the zone's egress rate (0-1) */
  boostOutflow: number;
  /** zone that receives diverted flow; null = held outside the venue */
  receivingZoneId: string | null;
  receivingZoneName: string | null;
  assumption: string;
  targetZoneId: string;
}

export interface ZoneProjection {
  zoneId: string;
  zoneName: string;
  baselinePercent: number;
  simulatedPercent: number;
  deltaPoints: number;
}

export interface ScenarioResult {
  zoneId: string;
  zoneName: string;
  horizonMinutes: number;
  baselinePercent: number;
  simulatedPercent: number;
  deltaPoints: number;
  improvementPercent: number;
  riskBefore: RiskLevel;
  riskAfter: RiskLevel;
  zones: ZoneProjection[];
  assumptions: string[];
  /** true when the source supplied enough signal to project a change */
  computable: boolean;
}

export const HORIZON_MINUTES = 5;

const clamp = (v: number, min = 0, max = 3) => Math.min(max, Math.max(min, v));

export function riskFromPercent(p: number): RiskLevel {
  if (p >= 0.9) return "CRITICAL";
  if (p >= 0.75) return "HIGH";
  if (p >= 0.55) return "MEDIUM";
  return "LOW";
}

/** Picks the least loaded zone that is not the target — the natural relief route. */
function reliefZone(zones: Zone[], targetId: string): Zone | undefined {
  return [...zones]
    .filter((z) => z.id !== targetId)
    .sort((a, b) => a.occupancyPercent - b.occupancyPercent)[0];
}

/** Builds the intervention catalogue from the CURRENT venue state. */
export function buildInterventions(zones: Zone[], targetZoneId: string): InterventionOption[] {
  const target = zones.find((z) => z.id === targetZoneId);
  if (!target) return [];
  const relief = reliefZone(zones, targetZoneId);
  const reliefName = relief?.name ?? null;
  const reliefId = relief?.id ?? null;

  return [
    {
      id: "redirect-20",
      action: reliefName
        ? `Redirect 20% of inflow → ${reliefName}`
        : "Redirect 20% of inflow away",
      type: "REROUTE",
      priority: 1,
      divertInflow: 0.2,
      boostOutflow: 0,
      receivingZoneId: reliefId,
      receivingZoneName: reliefName,
      assumption: "20% of arrivals are re-signed to the least loaded alternate route.",
      targetZoneId,
    },
    {
      id: "redirect-40",
      action: reliefName
        ? `Redirect 40% of inflow → ${reliefName}`
        : "Redirect 40% of inflow away",
      type: "REROUTE",
      priority: 2,
      divertInflow: 0.4,
      boostOutflow: 0,
      receivingZoneId: reliefId,
      receivingZoneName: reliefName,
      assumption: "40% of arrivals are re-signed; requires stewards at the split point.",
      targetZoneId,
    },
    {
      id: "open-alt-exit",
      action: "Open alternate exit route",
      type: "CAPACITY",
      priority: 3,
      divertInflow: 0,
      boostOutflow: 0.25,
      receivingZoneId: null,
      receivingZoneName: null,
      assumption: "An additional egress lane raises the zone's outflow rate by 25%.",
      targetZoneId,
    },
    {
      id: "deploy-staff",
      action: "Deploy stewards for lane discipline",
      type: "STAFFING",
      priority: 4,
      divertInflow: 0,
      boostOutflow: 0.1,
      receivingZoneId: null,
      receivingZoneName: null,
      assumption: "Lane discipline improves throughput by 10%.",
      targetZoneId,
    },
    {
      id: "restrict-access",
      action: "Restrict access to the zone",
      type: "ACCESS_CONTROL",
      priority: 5,
      divertInflow: 0.6,
      boostOutflow: 0,
      receivingZoneId: null,
      receivingZoneName: null,
      assumption: "60% of arrivals are held upstream until density drops.",
      targetZoneId,
    },
    {
      id: "remove-obstruction",
      action: "Clear obstruction in the walkway",
      type: "OBSTRUCTION",
      priority: 6,
      divertInflow: 0,
      boostOutflow: 0.15,
      receivingZoneId: null,
      receivingZoneName: null,
      assumption: "Removing a static bottleneck restores 15% of walkway throughput.",
      targetZoneId,
    },
  ];
}

interface Combined {
  divert: number;
  boost: number;
}

/** Stacked interventions get diminishing returns — modelled, and stated. */
function combine(selected: InterventionOption[]): Combined {
  const divert = 1 - selected.reduce((acc, i) => acc * (1 - i.divertInflow), 1);
  const boost = selected.reduce((acc, i, index) => acc + i.boostOutflow * 0.85 ** index, 0);
  return { divert: Math.min(0.8, divert), boost: Math.min(0.8, boost) };
}

function projectPercent(zone: Zone, divert: number, boost: number, minutes: number): number {
  if (!zone.capacity) return zone.occupancyPercent;
  const net = zone.inflow * (1 - divert) - zone.outflow * (1 + boost);
  const people = Math.max(0, zone.currentOccupancy + net * minutes);
  return clamp(people / zone.capacity);
}

export function runScenario(
  zones: Zone[],
  predictions: Prediction[],
  targetZoneId: string,
  selectedIds: string[],
): ScenarioResult | null {
  const target = zones.find((z) => z.id === targetZoneId);
  if (!target) return null;

  const catalogue = buildInterventions(zones, targetZoneId);
  const selected = catalogue.filter((i) => selectedIds.includes(i.id));
  const { divert, boost } = combine(selected);
  const prediction = predictions.find((p) => p.zoneId === targetZoneId);

  const hasFlow = target.inflow > 0 || target.outflow > 0;

  // Baseline: forecast from the data source when present, otherwise the
  // zone's own flow projection, otherwise the current occupancy.
  const modelBaseline = projectPercent(target, 0, 0, HORIZON_MINUTES);
  const baselinePercent =
    prediction && prediction.predictedOccupancy > 0
      ? prediction.predictedOccupancy
      : modelBaseline;

  // Apply the modelled relief as a delta on top of whichever baseline is used.
  const modelled = projectPercent(target, divert, boost, HORIZON_MINUTES);
  const relief = Math.max(0, modelBaseline - modelled);
  const simulatedPercent = clamp(Math.max(0, baselinePercent - relief));

  const zoneProjections: ZoneProjection[] = zones.map((z) => {
    if (z.id === targetZoneId) {
      return {
        zoneId: z.id,
        zoneName: z.name,
        baselinePercent,
        simulatedPercent,
        deltaPoints: Math.round((simulatedPercent - baselinePercent) * 100),
      };
    }
    const receives = selected.some((i) => i.receivingZoneId === z.id);
    const base =
      predictions.find((p) => p.zoneId === z.id)?.predictedOccupancy ||
      projectPercent(z, 0, 0, HORIZON_MINUTES);
    const divertedPeople = receives ? target.inflow * divert * HORIZON_MINUTES : 0;
    const sim = z.capacity ? clamp(base + divertedPeople / z.capacity) : base;
    return {
      zoneId: z.id,
      zoneName: z.name,
      baselinePercent: base,
      simulatedPercent: sim,
      deltaPoints: Math.round((sim - base) * 100),
    };
  });

  const assumptions = [
    `Projection horizon: ${HORIZON_MINUTES} minutes from the current state.`,
    hasFlow
      ? `Baseline flow: ${target.inflow.toFixed(1)} in/min, ${target.outflow.toFixed(1)} out/min.`
      : "No flow rates reported by the data source — relief cannot be modelled for this zone.",
    ...selected.map((i) => i.assumption),
  ];

  return {
    zoneId: target.id,
    zoneName: target.name,
    horizonMinutes: HORIZON_MINUTES,
    baselinePercent,
    simulatedPercent,
    deltaPoints: Math.round((baselinePercent - simulatedPercent) * 100),
    improvementPercent:
      baselinePercent > 0 ? ((baselinePercent - simulatedPercent) / baselinePercent) * 100 : 0,
    riskBefore: riskFromPercent(baselinePercent),
    riskAfter: riskFromPercent(simulatedPercent),
    zones: zoneProjections,
    assumptions,
    computable: hasFlow && selected.length > 0,
  };
}
