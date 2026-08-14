import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { VenueCanvas } from "@/components/digital-twin/VenueCanvas";
import { EventOverview } from "@/components/command-center/EventOverview";
import { EventTimeline } from "@/components/command-center/EventTimeline";
import { RiskMonitor } from "@/components/command-center/RiskMonitor";
import { PredictionChart } from "@/components/command-center/PredictionChart";
import { RootCausePanel } from "@/components/command-center/RootCausePanel";
import { InterventionPanel } from "@/components/command-center/InterventionPanel";
import { CriticalAlert } from "@/components/command-center/CriticalAlert";
import { CrowdReports } from "@/components/command-center/CrowdReports";
import { SystemHealthPanel } from "@/components/command-center/SystemHealthPanel";
import { ZoneDetail } from "@/components/command-center/ZoneDetail";
import { BeforeAfterComparison } from "@/components/interventions/BeforeAfterComparison";
import { useDemo } from "@/state/demo-store";
import { formatDuration } from "@/data/demo/scenario";
import { runScenario } from "@/lib/simulationModel";

export const Route = createFileRoute("/command-center")({
  head: () => ({
    meta: [
      { title: "Command Center — CrowdFlow Intelligence" },
      {
        name: "description",
        content:
          "Predictive crowd-management command center: observe live density, predict bottlenecks, explain causes and verify interventions in a venue digital twin.",
      },
      { property: "og:title", content: "CrowdFlow Intelligence — Command Center" },
      {
        property: "og:description",
        content:
          "Predict. Explain. Intervene. Live venue crowd intelligence with a digital twin, forecasting and intervention verification.",
      },
    ],
  }),
  component: CommandCenter,
});

const RECOMMENDED = ["redirect-20", "open-alt-exit"];

function CommandCenter() {
  const {
    crowd,
    predictions,
    selectedZoneId,
    selectZone,
    interventionApplied,
    selectedInterventionIds,
    focusZoneId,
    connection,
  } = useDemo();

  const top = [...predictions].sort((a, b) => b.riskScore - a.riskScore)[0];
  const focusId = selectedZoneId ?? focusZoneId;
  const focusPrediction = predictions.find((p) => p.zoneId === focusId) ?? top;
  const verification = runScenario(
    crowd.zones,
    predictions,
    focusId,
    selectedInterventionIds.length ? selectedInterventionIds : RECOMMENDED,
  );

  return (
    <AppShell>
      <div className="space-y-3 p-3">
        {connection === "NO_DATA" ? <PipelineNotice /> : null}
        {connection === "OFFLINE" ? <OfflineNotice /> : null}
        <CriticalAlert />

        <div className="grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <EventOverview />
            <CrowdReports />
            <SystemHealthPanel />
          </div>

          <div className="space-y-3">
            <div className="relative h-[520px] overflow-hidden border border-border bg-[#0f131a]">
              <VenueCanvas
                className="block size-full"
                zones={crowd.zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={selectZone}
                predictedZoneId={top?.zoneId ?? focusId}
                predictedPercent={top?.predictedOccupancy ?? 0}
                etaLabel={formatDuration(top?.timeToCritical ?? null)}
                interventionApplied={interventionApplied}
              />
              <div className="pointer-events-none absolute top-3 left-3">
                <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-foreground/90">
                  DIGITAL TWIN — LIVE CROWD FLOW
                </p>
                <p className="font-mono text-[9px] tracking-[0.18em] text-muted-foreground">
                  {crowd.currentCrowd.toLocaleString("en-IN")} PEOPLE TRACKED · CLICK A ZONE
                </p>
              </div>
              <Legend />
            </div>
            <EventTimeline />
          </div>

          <div className="space-y-3">
            <RiskMonitor />
            <ZoneDetail zoneId={focusId} />
          </div>
        </div>

        {focusPrediction ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
            <PredictionChart prediction={focusPrediction} compact />
            <RootCausePanel zoneId={focusPrediction.zoneId} />
            <InterventionPanel />
          </div>
        ) : null}

        {verification ? (
          <section className="border border-border bg-panel p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="tech-label text-foreground/85">Digital Twin Verification</h2>
              <span className="tech-label">
                {interventionApplied ? "INTERVENTION APPLIED" : "MODELLED OUTCOME"}
              </span>
            </div>
            <BeforeAfterComparison result={verification} />
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function PipelineNotice() {
  return (
    <div className="border border-moderate/50 bg-moderate/10 px-4 py-2.5">
      <p className="font-mono text-sm font-bold tracking-[0.12em] text-moderate">
        PIPELINE DATA UNAVAILABLE
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Run the CrowdFlow analysis pipeline to generate live crowd data. No values are being
        substituted.
      </p>
    </div>
  );
}

function OfflineNotice() {
  const { connectionError, lastUpdatedAt } = useDemo();
  const seconds = lastUpdatedAt ? Math.round((Date.now() - lastUpdatedAt) / 1000) : null;
  return (
    <div className="border border-critical/50 bg-critical/10 px-4 py-2.5">
      <p className="font-mono text-sm font-bold tracking-[0.12em] text-critical">
        BACKEND OFFLINE
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {seconds !== null
          ? `Last successful update: ${seconds} seconds ago.`
          : "No successful update has been received yet."}{" "}
        {connectionError ?? ""}
      </p>
    </div>
  );
}

function Legend() {
  const items = [
    { label: "SAFE", cls: "bg-safe" },
    { label: "MODERATE", cls: "bg-moderate" },
    { label: "HIGH", cls: "bg-high" },
    { label: "CRITICAL", cls: "bg-critical" },
  ];
  return (
    <div className="pointer-events-none absolute right-3 bottom-3 flex gap-3 border border-border bg-panel/85 px-2.5 py-1.5">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className={`size-2 ${i.cls}`} aria-hidden />
          <span className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground">
            {i.label}
          </span>
        </span>
      ))}
    </div>
  );
}
