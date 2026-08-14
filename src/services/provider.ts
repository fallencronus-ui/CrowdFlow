import type { CrowdDataProvider } from "./dataProvider";
import { DemoDataProvider } from "./demoProvider";
import { BackendDataProvider } from "./backendProvider";

export type DataSourceMode = "DEMO" | "BACKEND";

const demoProvider = new DemoDataProvider();
let backendProvider: BackendDataProvider | null = null;

/** Default provider (demo). Kept for backwards compatibility. */
export const dataProvider: CrowdDataProvider = demoProvider;

export function getProvider(mode: DataSourceMode): CrowdDataProvider {
  if (mode === "DEMO") return demoProvider;
  if (!backendProvider) backendProvider = new BackendDataProvider();
  return backendProvider;
}

/** Forces a fresh backend provider (clears its venue-config cache). */
export function resetBackendProvider() {
  backendProvider = null;
}
