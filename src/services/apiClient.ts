/**
 * Thin HTTP client for the FastAPI layer around the existing Python backend.
 * Base URL comes from VITE_API_URL — never hard-code it in components.
 */

export const API_BASE_URL: string =
  (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    signal: signal ?? null,
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = (await res.json())?.detail;
    } catch {
      detail = undefined;
    }
    const message =
      typeof detail === "object" && detail && "message" in detail
        ? String((detail as { message: unknown }).message)
        : `Request failed: ${path} (${res.status})`;
    throw new ApiError(message, res.status, detail);
  }
  return (await res.json()) as T;
}

// ---- Raw backend payload shapes (mirror the FastAPI responses) ----

export interface ApiVenue {
  venue_name: string | null;
  zones: Record<string, { area_m2: number; capacity: number }>;
  density_thresholds: Record<string, number> | null;
}

export interface ApiCurrentZone {
  name: string;
  people: number;
  capacity: number | null;
  area_m2: number | null;
  occupancyPercent: number | null;
}

export interface ApiCurrent {
  latestFrame: number;
  zones: ApiCurrentZone[];
}

export interface ApiDensityZone {
  frame: number;
  zone: string;
  people: number;
  area_m2: number | null;
  capacity: number | null;
  density: number | null;
  capacity_usage: number | null;
  density_level: string | null;
  capacity_status: string | null;
}

export interface ApiFlowZone {
  zone: string;
  minute: number | null;
  entriesPerMinute: number | null;
  exitsPerMinute: number | null;
  netFlowPerMinute: number | null;
  flowStatus: string | null;
  directions: Record<string, unknown> | null;
}

export interface ApiCongestionZone {
  zone: string;
  frame: number | null;
  people: number | null;
  previous_people: number | null;
  density_change: number | null;
  growth_rate: number | null;
  congestion: string | null;
  trend?: string | null;
}

export interface ApiWarningZone {
  zone: string;
  people: number | null;
  area_m2: number | null;
  density_people_m2: number | null;
  capacity: number | null;
  capacity_usage: number | null;
  entries_per_minute: number | null;
  exits_per_minute: number | null;
  net_flow_per_minute: number | null;
  minutes_to_capacity: number | null;
  risk_score: number | null;
  risk_level: string | null;
  prediction: string | null;
  recommendation: string | null;
}

export interface ApiPredictionZone {
  zone: string;
  current_people: number | null;
  trend_people_per_minute: number | null;
  predicted_people_5_min: number | null;
  predicted_people_10_min: number | null;
  capacity: number | null;
  minutes_to_capacity: number | null;
  trend: string | null;
  prediction: string | null;
}

export interface ApiTimeline {
  density: Array<{
    frame: number;
    zone: string;
    people: number | null;
    density: number | null;
    capacity: number | null;
    capacityUsage: number | null;
    densityLevel: string | null;
    capacityStatus: string | null;
  }>;
  flow: Array<{
    minute: number | null;
    zone: string;
    entriesPerMinute: number | null;
    exitsPerMinute: number | null;
    netFlowPerMinute: number | null;
    flowStatus: string | null;
  }>;
}

export const api = {
  health: (signal?: AbortSignal) => apiGet<{ status: string }>("/api/health", signal),
  venue: (signal?: AbortSignal) => apiGet<ApiVenue>("/api/venue", signal),
  current: (signal?: AbortSignal) => apiGet<ApiCurrent>("/api/crowd/current", signal),
  density: (signal?: AbortSignal) =>
    apiGet<{ latestFrame: number | null; zones: ApiDensityZone[] }>(
      "/api/crowd/density",
      signal,
    ),
  flow: (signal?: AbortSignal) =>
    apiGet<{ zones: ApiFlowZone[] }>("/api/crowd/flow", signal),
  congestion: (signal?: AbortSignal) =>
    apiGet<{ source: string; zones: ApiCongestionZone[] }>("/api/crowd/congestion", signal),
  warnings: (signal?: AbortSignal) =>
    apiGet<{ zones: ApiWarningZone[] }>("/api/warnings", signal),
  predictions: (signal?: AbortSignal) =>
    apiGet<{ zones: ApiPredictionZone[] }>("/api/predictions", signal),
  timeline: (signal?: AbortSignal) => apiGet<ApiTimeline>("/api/crowd/timeline", signal),
};
