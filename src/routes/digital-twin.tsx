import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { VenueCanvas } from "@/components/digital-twin/VenueCanvas";
import { ZoneDetail } from "@/components/command-center/ZoneDetail";
import { PredictionChart } from "@/components/command-center/PredictionChart";
import { useDemo } from "@/state/demo-store";
import { formatDuration } from "@/data/demo/scenario";

export const Route = createFileRoute("/digital-twin")({
  head: () => ({
    meta: [
      { title: "Digital Twin — CrowdFlow Intelligence" },
      {
        name: "description",
        content:
          "Full-screen venue digital twin with live crowd particles, density heatmap and predicted bottleneck indicators.",
      },
      { property: "og:title", content: "Digital Twin — CrowdFlow Intelligence" },
      {
        property: "og:description",
        content: "Live venue simulation with density overlays and predicted bottlenecks.",
      },
    ],
  }),
  component: DigitalTwinPage,
});

function DigitalTwinPage() {
  const { crowd, predictions, selectedZoneId, selectZone, interventionApplied } = useDemo();
  const top = [...predictions].sort((a, b) => b.riskScore - a.riskScore)[0];
  const focusId = selectedZoneId ?? top?.zoneId ?? "corridor-c";
  const focus = predictions.find((p) => p.zoneId === focusId);

  return (
    <AppShell>
      <PageHeader
        title="Digital Twin"
        subtitle="Computational model of the venue — live flow, density and predicted bottlenecks."
      />
      <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative h-[calc(100vh-15rem)] min-h-[420px] overflow-hidden border border-border bg-[#0f131a]">
          <VenueCanvas
            className="block size-full"
            zones={crowd.zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={selectZone}
            predictedZoneId={top?.zoneId ?? "corridor-c"}
            predictedPercent={top?.predictedOccupancy ?? 0}
            etaLabel={formatDuration(top?.timeToCritical ?? null)}
            interventionApplied={interventionApplied}
          />
        </div>
        <div className="space-y-3">
          <ZoneDetail zoneId={focusId} />
          {focus ? <PredictionChart prediction={focus} compact /> : null}
        </div>
      </div>
    </AppShell>
  );
}
