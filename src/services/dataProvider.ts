import type { CrowdState } from "@/types/crowd";
import type { Venue, VenueEvent } from "@/types/venue";
import type { Prediction, RootCauseAnalysis } from "@/types/prediction";
import type { Intervention, SimulationResult } from "@/types/intervention";
import type {
  HotspotStat,
  Incident,
  InfrastructureRecommendation,
} from "@/types/incident";

/**
 * Transport-agnostic contract consumed by every UI component.
 *
 * DemoDataProvider implements it today. A BackendDataProvider (Python API)
 * can be dropped in later by implementing the same interface and swapping the
 * single export in `src/services/provider.ts` — no UI changes required.
 */
export interface CrowdDataProvider {
  readonly mode: "DEMO" | "LIVE";
  getVenue(): Promise<Venue>;
  getEvent(): Promise<VenueEvent>;
  getCrowdState(query: ProviderQuery): Promise<CrowdState>;
  getPredictions(query: ProviderQuery): Promise<Prediction[]>;
  getRootCause(zoneId: string, query: ProviderQuery): Promise<RootCauseAnalysis>;
  getInterventions(zoneId: string): Promise<Intervention[]>;
  simulateIntervention(
    interventionIds: string[],
    query: ProviderQuery,
  ): Promise<SimulationResult>;
  getIncidents(): Promise<Incident[]>;
  getHotspots(): Promise<HotspotStat[]>;
  getInfrastructureRecommendations(): Promise<InfrastructureRecommendation[]>;
}

/**
 * The simulation cursor. With a live backend `simSecond` is simply ignored and
 * the server returns its own current state.
 */
export interface ProviderQuery {
  simSecond: number;
  interventionAppliedAt: number | null;
}
