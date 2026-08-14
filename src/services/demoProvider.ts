import type { CrowdDataProvider, ProviderQuery } from "./dataProvider";
import { demoEvent, demoVenue } from "@/data/demo/venue";
import {
  buildCrowdState,
  buildPredictions,
  buildRootCause,
  INTERVENTIONS,
  simulate,
} from "@/data/demo/scenario";
import { demoHotspots, demoIncidents, demoInfrastructure } from "@/data/demo/incidents";

const ok = <T>(value: T): Promise<T> => Promise.resolve(value);

export class DemoDataProvider implements CrowdDataProvider {
  readonly mode = "DEMO" as const;

  getVenue() {
    return ok(demoVenue);
  }

  getEvent() {
    return ok(demoEvent);
  }

  getCrowdState(q: ProviderQuery) {
    return ok(buildCrowdState(q.simSecond, q.interventionAppliedAt));
  }

  getPredictions(q: ProviderQuery) {
    return ok(buildPredictions(q.simSecond, q.interventionAppliedAt));
  }

  getRootCause(zoneId: string) {
    return ok(buildRootCause(zoneId));
  }

  getInterventions(_zoneId: string) {
    return ok([...INTERVENTIONS].sort((a, b) => a.priority - b.priority));
  }

  simulateIntervention(interventionIds: string[], q: ProviderQuery) {
    return ok(simulate(interventionIds, q.simSecond, q.interventionAppliedAt));
  }

  getIncidents() {
    return ok(demoIncidents);
  }

  getHotspots() {
    return ok(demoHotspots);
  }

  getInfrastructureRecommendations() {
    return ok(demoInfrastructure);
  }
}
