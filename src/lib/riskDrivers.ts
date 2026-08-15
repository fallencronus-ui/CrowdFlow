import type { Zone } from "@/types/crowd";
import type { Prediction } from "@/types/prediction";

/**
 * Explainable, rule-based risk decomposition.
 *
 * Every driver is derived from a signal the data source actually reports
 * (occupancy, density growth, inflow/outflow, forecast, recurrence).
 * When a signal is missing the driver is marked UNAVAILABLE and its value is
 * rendered as N/A — never substituted with an invented number.
 */
export type DriverLevel = "LOW" | "MEDIUM" | "HIGH" | "UNAVAILABLE";

export interface RiskDriver {
  id: string;
  label: string;
  level: DriverLevel;
  /** formatted signal value, or "N/A" when the source does not provide it */
  value: string;
  detail: string;
  /** relative weighting 0-100, used only for the bar length */
  weight: number;
}

export interface RiskExplanation {
  zoneId: string;
  zoneName: string;
  drivers: RiskDriver[];
  summary: string;
}

const has = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

const pct = (v: number) => `${Math.round(v * 100)}%`;

function level(value: number, medium: number, high: number): DriverLevel {
  if (value >= high) return "HIGH";
  if (value >= medium) return "MEDIUM";
  return "LOW";
}

const WEIGHT: Record<DriverLevel, number> = {
  HIGH: 100,
  MEDIUM: 58,
  LOW: 24,
  UNAVAILABLE: 8,
};

export interface RecurrenceSignal {
  /** how many observations in the historical window flagged this zone */
  observations: number;
  /** total observations in the window */
  total: number;
}

export function buildRiskExplanation(
  zone: Zone | undefined,
  prediction: Prediction | undefined,
  recurrence?: RecurrenceSignal,
): RiskExplanation {
  const zoneName = zone?.name ?? prediction?.zoneName ?? "Unknown zone";
  const drivers: RiskDriver[] = [];

  // 1. Capacity utilisation
  if (zone && has(zone.occupancyPercent)) {
    const l = level(zone.occupancyPercent, 0.6, 0.8);
    drivers.push({
      id: "capacity",
      label: "Capacity utilisation",
      level: l,
      value: pct(zone.occupancyPercent),
      detail: zone.capacity
        ? `${Math.round(zone.currentOccupancy)} of ${Math.round(zone.capacity)} capacity`
        : "Occupancy relative to zone capacity",
      weight: WEIGHT[l],
    });
  } else {
    drivers.push(unavailable("capacity", "Capacity utilisation", "No occupancy reported"));
  }

  // 2. Density growth
  if (zone && has(zone.growthRate) && zone.growthRate !== 0) {
    const g = Math.abs(zone.growthRate);
    const l = level(g, 0.05, 0.15);
    drivers.push({
      id: "growth",
      label: "Density growth",
      level: l,
      value: `${zone.growthRate > 0 ? "+" : ""}${(zone.growthRate * 100).toFixed(1)}%`,
      detail: "Change in zone occupancy between the last two observations",
      weight: WEIGHT[l],
    });
  } else if (zone && has(zone.density) && zone.density > 0) {
    const l = level(zone.density, 2, 4);
    drivers.push({
      id: "growth",
      label: "Crowd density",
      level: l,
      value: `${zone.density.toFixed(2)} p/m²`,
      detail: "People per square metre in the zone footprint",
      weight: WEIGHT[l],
    });
  } else {
    drivers.push(unavailable("growth", "Density growth", "No growth signal reported"));
  }

  // 3. Net flow (inflow vs outflow)
  if (zone && (zone.inflow > 0 || zone.outflow > 0)) {
    const net = zone.inflow - zone.outflow;
    const l = net <= 0 ? "LOW" : level(net, 4, 12);
    drivers.push({
      id: "netflow",
      label: "Net inflow",
      level: l,
      value: `${net > 0 ? "+" : ""}${net.toFixed(1)}/min`,
      detail: `Inflow ${zone.inflow.toFixed(1)}/min · outflow ${zone.outflow.toFixed(1)}/min`,
      weight: WEIGHT[l],
    });
    if (zone.inflow > 0 && zone.outflow < zone.inflow * 0.6) {
      drivers.push({
        id: "outflow",
        label: "Insufficient outflow",
        level: "HIGH",
        value: `${zone.outflow.toFixed(1)}/min`,
        detail: "Egress rate is below 60% of the arrival rate",
        weight: WEIGHT.HIGH,
      });
    }
  } else {
    drivers.push(unavailable("netflow", "Net inflow", "No flow measurement reported"));
  }

  // 4. Predicted capacity breach
  if (prediction && has(prediction.predictedOccupancy) && prediction.predictedOccupancy > 0) {
    const l = level(prediction.predictedOccupancy, 0.7, 0.9);
    drivers.push({
      id: "forecast",
      label: "Predicted capacity breach",
      level: l,
      value: pct(prediction.predictedOccupancy),
      detail: `Projected occupancy in ${prediction.horizonMinutes} min`,
      weight: WEIGHT[l],
    });
  } else {
    drivers.push(
      unavailable("forecast", "Predicted capacity breach", "No forecast available for this zone"),
    );
  }

  // 5. Historical recurrence
  if (recurrence && recurrence.total > 0) {
    const share = recurrence.observations / recurrence.total;
    const l = share === 0 ? "LOW" : level(share, 0.15, 0.35);
    drivers.push({
      id: "recurrence",
      label: "Historical recurrence",
      level: l,
      value: `${recurrence.observations}/${recurrence.total}`,
      detail: "Observations in the recorded window flagged high density here",
      weight: WEIGHT[l],
    });
  } else {
    drivers.push(
      unavailable("recurrence", "Historical recurrence", "No historical record available"),
    );
  }

  const highs = drivers.filter((d) => d.level === "HIGH");
  const summary = highs.length
    ? `${zoneName} is driven primarily by ${highs
        .map((d) => d.label.toLowerCase())
        .join(", ")}.`
    : `No dominant risk driver: all reported signals for ${zoneName} are within nominal range.`;

  return { zoneId: zone?.id ?? prediction?.zoneId ?? "", zoneName, drivers, summary };
}

function unavailable(id: string, label: string, detail: string): RiskDriver {
  return { id, label, level: "UNAVAILABLE", value: "N/A", detail, weight: WEIGHT.UNAVAILABLE };
}
