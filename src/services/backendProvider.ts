import type { CrowdDataProvider, ProviderQuery } from "./dataProvider";
import { DemoDataProvider } from "./demoProvider";
import {
  api,
  type ApiCongestionZone,
  type ApiCurrentZone,
  type ApiDensityZone,
  type ApiFlowZone,
  type ApiPredictionZone,
  type ApiTimeline,
  type ApiVenue,
  type ApiWarningZone,
} from "./apiClient";
import { demoVenue } from "@/data/demo/venue";
import type { CrowdState, RiskLevel, Zone } from "@/types/crowd";
import type { ForecastPoint, Prediction } from "@/types/prediction";
import type { Venue, VenueEvent, ZoneDefinition } from "@/types/venue";
import type {
  HotspotStat,
  Incident,
  InfrastructureRecommendation,
} from "@/types/incident";

/**
 * Features the original Python backend does not produce. These keep using the
 * demo generators so they can be swapped later without touching the UI.
 */
export const DEMO_ONLY_FEATURES = [
  "root-cause analysis",
  "intervention catalogue & simulation",
  "historical incidents & hotspots",
  "infrastructure recommendations",
  "crowd report / confidence signals",
] as const;

const RISK_LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const toRiskLevel = (value: string | null | undefined): RiskLevel => {
  const upper = (value ?? "").toUpperCase();
  return (RISK_LEVELS.find((l) => l === upper) ?? "LOW") as RiskLevel;
};

const num = (value: number | null | undefined, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * The Python backend has no venue geometry, only zone names + area + capacity.
 * The existing Digital Twin map is reused as the drawing surface: backend zones
 * are placed onto the existing zone slots in order. Only the layout is borrowed —
 * every displayed number comes from the backend.
 */
function geometrySlots(): ZoneDefinition[] {
  return demoVenue.zones;
}

function slugToSlot(index: number): ZoneDefinition | undefined {
  return geometrySlots()[index];
}

export class BackendDataProvider implements CrowdDataProvider {
  readonly mode = "LIVE" as const;

  private demo = new DemoDataProvider();
  private venueCache: ApiVenue | null = null;
  /** backend zone name -> demo geometry slot id */
  private zoneIdByName = new Map<string, string>();
  private zoneNameById = new Map<string, string>();
  private historyCache: HistoryModel | null = null;

  private async venueConfig(): Promise<ApiVenue> {
    if (this.venueCache) return this.venueCache;
    const config = await api.venue();
    this.venueCache = config;
    this.zoneIdByName.clear();
    this.zoneNameById.clear();
    Object.keys(config.zones ?? {}).forEach((name, index) => {
      const slot = slugToSlot(index);
      const id = slot ? slot.id : `backend-zone-${index}`;
      this.zoneIdByName.set(name, id);
      this.zoneNameById.set(id, name);
    });
    return config;
  }

  async getVenue(): Promise<Venue> {
    const config = await this.venueConfig();
    const names = Object.keys(config.zones ?? {});
    const zones = names.flatMap((name, index) => {
      const slot = slugToSlot(index);
      if (!slot) return [];
      const cfg = config.zones[name]!;
      return [
        {
          ...slot,
          name,
          shortName: name.toUpperCase(),
          capacity: cfg.capacity,
          area: cfg.area_m2,
        },
      ];
    });
    return {
      ...demoVenue,
      id: "backend-venue",
      name: config.venue_name ?? demoVenue.name,
      zones: zones.length ? zones : demoVenue.zones,
    };
  }

  async getEvent(): Promise<VenueEvent> {
    // The backend exposes no event metadata — keep the demo event shell but use
    // the real venue name.
    const [event, config] = await Promise.all([this.demo.getEvent(), this.venueConfig()]);
    return { ...event, venueName: config.venue_name ?? event.venueName };
  }

  async getCrowdState(q: ProviderQuery): Promise<CrowdState> {
    const config = await this.venueConfig();

    const [current, density, flow, congestion, warnings] = await Promise.all([
      api.current(),
      api.density().catch(() => null),
      api.flow().catch(() => null),
      api.congestion().catch(() => null),
      api.warnings().catch(() => null),
    ]);

    const densityByZone = new Map<string, ApiDensityZone>(
      (density?.zones ?? []).map((z) => [z.zone, z]),
    );
    const flowByZone = new Map<string, ApiFlowZone>(
      (flow?.zones ?? []).map((z) => [z.zone, z]),
    );
    const congestionByZone = new Map<string, ApiCongestionZone>(
      (congestion?.zones ?? []).map((z) => [z.zone, z]),
    );
    const warningByZone = new Map<string, ApiWarningZone>(
      (warnings?.zones ?? []).map((z) => [z.zone, z]),
    );

    const zones: Zone[] = current.zones.flatMap((z: ApiCurrentZone, index) => {
      const id = this.zoneIdByName.get(z.name) ?? slugToSlot(index)?.id;
      if (!id) return [];
      const d = densityByZone.get(z.name);
      const f = flowByZone.get(z.name);
      const c = congestionByZone.get(z.name);
      const w = warningByZone.get(z.name);
      const capacity = num(z.capacity ?? d?.capacity ?? null);
      const occupancy =
        z.occupancyPercent !== null && z.occupancyPercent !== undefined
          ? z.occupancyPercent / 100
          : capacity
            ? z.people / capacity
            : 0;
      return [
        {
          id,
          name: z.name,
          shortName: z.name.toUpperCase(),
          kind: slugToSlot(index)?.kind ?? "CORRIDOR",
          capacity,
          area: num(z.area_m2 ?? d?.area_m2 ?? null),
          currentOccupancy: z.people,
          occupancyPercent: occupancy,
          density: num(d?.density ?? w?.density_people_m2 ?? null),
          inflow: num(f?.entriesPerMinute ?? w?.entries_per_minute ?? null),
          outflow: num(f?.exitsPerMinute ?? w?.exits_per_minute ?? null),
          growthRate: num(c?.growth_rate ?? null),
          riskScore: Math.round(num(w?.risk_score ?? null)),
          // congestion.py / zone_congestion.py classification is authoritative
          riskLevel: toRiskLevel(c?.congestion ?? w?.risk_level ?? d?.density_level),
        },
      ];
    });

    const currentCrowd = zones.reduce((sum, z) => sum + z.currentOccupancy, 0);
    const totalCapacity = Object.values(config.zones ?? {}).reduce(
      (sum, z) => sum + (z.capacity ?? 0),
      0,
    );

    return {
      simSecond: q.simSecond,
      clock: `FRAME ${current.latestFrame}`,
      // The backend has no event phase model — these stay neutral in LIVE mode.
      phase: "NORMAL",
      eventState: "IN_PROGRESS",
      totalAttendees: totalCapacity,
      currentCrowd,
      venueUtilization: totalCapacity ? currentCrowd / totalCapacity : 0,
      secondsToEventEnd: 0,
      exitSurgeLevel: "LOW",
      zones,
      reports: {
        reports: 0,
        cctvConfidence: 0,
        simulationConfidence: 0,
        historicalConfidence: "LOW",
      },
      health: {
        crowdState: true,
        predictionEngine: Boolean(warnings),
        riskEngine: Boolean(congestion),
        digitalTwin: Boolean(density),
      },
      interventionApplied: false,
    };
  }

  async getPredictions(_q: ProviderQuery): Promise<Prediction[]> {
    await this.venueConfig();
    const [predictions, warnings, timeline] = await Promise.all([
      api.predictions(),
      api.warnings().catch(() => null),
      api.timeline().catch(() => null),
    ]);

    const warningByZone = new Map<string, ApiWarningZone>(
      (warnings?.zones ?? []).map((z) => [z.zone, z]),
    );

    return predictions.zones.flatMap((p: ApiPredictionZone, index) => {
      const id = this.zoneIdByName.get(p.zone) ?? slugToSlot(index)?.id;
      if (!id) return [];
      const capacity = num(p.capacity, 0);
      const w = warningByZone.get(p.zone);
      const currentOccupancy = capacity ? num(p.current_people) / capacity : 0;
      const predictedOccupancy = capacity
        ? num(p.predicted_people_5_min, num(p.current_people)) / capacity
        : 0;

      return [
        {
          zoneId: id,
          zoneName: p.zone,
          currentOccupancy,
          predictedOccupancy,
          capacityThreshold: 1,
          horizonMinutes: 5,
          timeToCritical:
            p.minutes_to_capacity === null || p.minutes_to_capacity === undefined
              ? null
              : p.minutes_to_capacity * 60,
          growthRate: num(p.trend_people_per_minute),
          // crowd_prediction.py emits no confidence value — not fabricated.
          confidence: 0,
          riskLevel: toRiskLevel(w?.risk_level),
          riskScore: Math.round(num(w?.risk_score)),
          forecast: buildForecast(p, capacity, timeline),
        },
      ];
    });
  }

  // ---- Explainability & scenario modelling are computed in the UI layer from
  // the live state (see src/lib/riskDrivers.ts and src/lib/simulationModel.ts).
  // The demo generators remain the source for DEMO mode only. ----
  getRootCause(zoneId: string, _q: ProviderQuery) {
    return this.demo.getRootCause(zoneId);
  }

  getInterventions(zoneId: string) {
    return this.demo.getInterventions(zoneId);
  }

  simulateIntervention(ids: string[], q: ProviderQuery) {
    return this.demo.simulateIntervention(ids, q);
  }

  /**
   * Historical intelligence derived from the analysis pipeline's own output
   * (/api/crowd/timeline). No dates are invented: observations are labelled by
   * frame, which is what the pipeline actually records.
   */
  private async history(): Promise<HistoryModel> {
    if (this.historyCache) return this.historyCache;
    await this.venueConfig();
    const timeline = await api.timeline().catch(() => null);
    const model = buildHistory(timeline, (name) => this.zoneIdByName.get(name) ?? name);
    this.historyCache = model;
    return model;
  }

  async getIncidents(): Promise<Incident[]> {
    return (await this.history()).incidents;
  }

  async getHotspots(): Promise<HotspotStat[]> {
    return (await this.history()).hotspots;
  }

  async getInfrastructureRecommendations(): Promise<InfrastructureRecommendation[]> {
    return (await this.history()).recommendations;
  }
}

interface HistoryModel {
  incidents: Incident[];
  hotspots: HotspotStat[];
  recommendations: InfrastructureRecommendation[];
}

const HIGH_USAGE = 0.75;
const MEDIUM_USAGE = 0.55;

function buildHistory(
  timeline: ApiTimeline | null,
  idFor: (zoneName: string) => string,
): HistoryModel {
  const rows = timeline?.density ?? [];
  const flowRows = timeline?.flow ?? [];
  if (!rows.length) {
    return { incidents: [], hotspots: [], recommendations: [] };
  }

  const byZone = new Map<string, typeof rows>();
  rows.forEach((row) => {
    const list = byZone.get(row.zone) ?? [];
    list.push(row);
    byZone.set(row.zone, list);
  });

  const incidents: Incident[] = [];
  const hotspots: HotspotStat[] = [];
  const recommendations: InfrastructureRecommendation[] = [];

  byZone.forEach((zoneRows, zoneName) => {
    const zoneId = idFor(zoneName);
    const sorted = [...zoneRows].sort((a, b) => a.frame - b.frame);
    const usage = (r: (typeof rows)[number]) =>
      r.capacityUsage !== null && r.capacityUsage !== undefined
        ? r.capacityUsage > 1
          ? r.capacityUsage / 100
          : r.capacityUsage
        : null;

    // Contiguous runs above the high-usage threshold become "observations".
    let run: Array<(typeof rows)[number]> = [];
    const runs: Array<Array<(typeof rows)[number]>> = [];
    sorted.forEach((row) => {
      const u = usage(row);
      if (u !== null && u >= HIGH_USAGE) {
        run.push(row);
      } else if (run.length) {
        runs.push(run);
        run = [];
      }
    });
    if (run.length) runs.push(run);

    runs.forEach((group, index) => {
      const first = group[0]!;
      const last = group[group.length - 1]!;
      const peak = Math.max(...group.map((r) => usage(r) ?? 0));
      incidents.push({
        id: `${zoneName}-${first.frame}`,
        zoneId,
        zoneName,
        date: `FRAME ${first.frame}`,
        eventName: `Observation ${index + 1}`,
        peakDensity: peak,
        durationMinutes: 0,
        durationLabel: `${last.frame - first.frame + 1} frames`,
        trigger: "Capacity usage sustained above 75%",
        severity: peak >= 0.9 ? "HIGH" : "MEDIUM",
      });
    });

    const highCount = sorted.filter((r) => (usage(r) ?? 0) >= HIGH_USAGE).length;
    const mediumCount = sorted.filter((r) => {
      const u = usage(r) ?? 0;
      return u >= MEDIUM_USAGE && u < HIGH_USAGE;
    }).length;
    const severity: "LOW" | "MEDIUM" | "HIGH" =
      highCount > 0 ? "HIGH" : mediumCount > 0 ? "MEDIUM" : "LOW";

    // Trend = high-usage observations bucketed into frame ranges.
    const buckets = 5;
    const minFrame = sorted[0]!.frame;
    const maxFrame = sorted[sorted.length - 1]!.frame;
    const span = Math.max(1, maxFrame - minFrame + 1);
    const size = Math.ceil(span / buckets);
    const trend = Array.from({ length: buckets }, (_, i) => {
      const from = minFrame + i * size;
      const to = from + size - 1;
      const count = sorted.filter(
        (r) => r.frame >= from && r.frame <= to && (usage(r) ?? 0) >= HIGH_USAGE,
      ).length;
      return { period: `F${from}`, incidents: count };
    });

    const avgRunFrames = runs.length
      ? runs.reduce((a, g) => a + (g[g.length - 1]!.frame - g[0]!.frame + 1), 0) / runs.length
      : 0;

    hotspots.push({
      zoneId,
      zoneName,
      incidents: highCount,
      severity,
      exitSurgeShare: null,
      averageDurationMinutes: null,
      averageDurationLabel: runs.length ? `${Math.round(avgRunFrames)} frames` : "N/A",
      primaryInflowSource: null,
      frequentObstruction: null,
      trend,
      infrastructureRisk: severity,
      unitLabel: "high-density observations",
    });

    // Infrastructure signals — phrased as hypotheses, only from real signals.
    const zoneFlow = flowRows.filter((f) => f.zone === zoneName);
    const avgIn = average(zoneFlow.map((f) => f.entriesPerMinute));
    const avgOut = average(zoneFlow.map((f) => f.exitsPerMinute));
    const factors: string[] = [];
    if (highCount > 0) factors.push(`${highCount} observations above 75% capacity`);
    if (avgIn !== null && avgOut !== null && avgOut < avgIn * 0.8) {
      factors.push(
        `Mean inflow ${avgIn.toFixed(1)}/min vs outflow ${avgOut.toFixed(1)}/min`,
      );
    }
    if (factors.length) {
      recommendations.push({
        id: `rec-${zoneId}`,
        zoneId,
        title: `Investigate sustained loading in ${zoneName}`,
        rationale:
          avgIn !== null && avgOut !== null && avgOut < avgIn * 0.8
            ? "Repeated high occupancy was observed with inflow persistently exceeding outflow. Consider adding egress capacity or rebalancing arrival routes into this zone."
            : "Repeated high occupancy was observed in this zone. Potential improvement: review route distribution so recurring load is shared with less used zones.",
        impact: severity === "HIGH" ? "HIGH" : "MEDIUM",
        effort: "MEDIUM",
        factors,
      });
    }
  });

  hotspots.sort((a, b) => b.incidents - a.incidents);
  incidents.sort((a, b) => b.peakDensity - a.peakDensity);
  recommendations.sort((a, b) => (b.impact === "HIGH" ? 1 : 0) - (a.impact === "HIGH" ? 1 : 0));

  // Underused alternate routes are a defensible, data-backed observation.
  const worst = hotspots[0];
  const quietest = [...hotspots].sort((a, b) => a.incidents - b.incidents)[0];
  if (worst && quietest && worst.zoneId !== quietest.zoneId && worst.incidents > 0) {
    recommendations.push({
      id: "rec-route-balance",
      zoneId: worst.zoneId,
      title: `Consider rebalancing flow from ${worst.zoneName} toward ${quietest.zoneName}`,
      rationale: `${worst.zoneName} repeatedly approaches capacity while ${quietest.zoneName} records ${quietest.incidents} high-density observations over the same window.`,
      impact: "MEDIUM-HIGH",
      effort: "LOW",
      factors: [
        `${worst.zoneName}: ${worst.incidents} high-density observations`,
        `${quietest.zoneName}: ${quietest.incidents} high-density observations`,
      ],
    });
  }

  return { incidents, hotspots, recommendations };
}

function average(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Observed points come from videos/density_analysis.csv (through /api/crowd/timeline),
 * predicted points from videos/crowd_prediction.csv. Nothing is generated.
 */
function buildForecast(
  prediction: ApiPredictionZone,
  capacity: number,
  timeline: ApiTimeline | null,
): ForecastPoint[] {
  const observedRows = (timeline?.density ?? [])
    .filter((row) => row.zone === prediction.zone)
    .slice(-24);

  const observed: ForecastPoint[] = observedRows.map((row, i) => ({
    offsetSeconds: -(observedRows.length - 1 - i) * 60,
    label: `F${row.frame}`,
    observed: capacity ? num(row.people) / capacity : 0,
    predicted: null,
  }));

  const now: ForecastPoint = {
    offsetSeconds: 0,
    label: "NOW",
    observed: capacity ? num(prediction.current_people) / capacity : 0,
    predicted: capacity ? num(prediction.current_people) / capacity : 0,
  };

  const future: ForecastPoint[] = [];
  if (prediction.predicted_people_5_min !== null) {
    future.push({
      offsetSeconds: 300,
      label: "+5m",
      observed: null,
      predicted: capacity ? num(prediction.predicted_people_5_min) / capacity : 0,
    });
  }
  if (prediction.predicted_people_10_min !== null) {
    future.push({
      offsetSeconds: 600,
      label: "+10m",
      observed: null,
      predicted: capacity ? num(prediction.predicted_people_10_min) / capacity : 0,
    });
  }

  return [...observed, now, ...future];
}
