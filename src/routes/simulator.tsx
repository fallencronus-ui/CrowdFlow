import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { BeforeAfterComparison } from "@/components/interventions/BeforeAfterComparison";
import { VenueCanvas } from "@/components/digital-twin/VenueCanvas";
import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { useDemo } from "@/state/demo-store";
import { formatDuration } from "@/data/demo/scenario";
import { buildInterventions, runScenario } from "@/lib/simulationModel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Intervention Simulator — CrowdFlow Intelligence" },
      {
        name: "description",
        content:
          "Test an operational decision before deploying it: compare predicted peak density with and without each intervention.",
      },
      { property: "og:title", content: "Intervention Simulator — CrowdFlow Intelligence" },
      {
        property: "og:description",
        content: "Simulate crowd interventions and verify the outcome in the digital twin.",
      },
    ],
  }),
  component: SimulatorPage,
});

const DEFAULT_SELECTION = ["redirect-20"];

function SimulatorPage() {
  const {
    crowd,
    predictions,
    applyIntervention,
    interventionApplied,
    selectedZoneId,
    selectZone,
    focusZoneId,
    mode,
  } = useDemo();
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);

  const targetId = selectedZoneId ?? focusZoneId;
  const targetPrediction = predictions.find((p) => p.zoneId === targetId);
  const catalogue = useMemo(
    () => buildInterventions(crowd.zones, targetId),
    [crowd.zones, targetId],
  );
  const result = useMemo(
    () => runScenario(crowd.zones, predictions, targetId, selected),
    [crowd.zones, predictions, targetId, selected],
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <AppShell>
      <PageHeader
        title="Intervention Simulator"
        subtitle="Test an operational decision before deploying it."
        actions={
          <Link
            to="/command-center"
            className="border border-border-strong px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            ← COMMAND CENTER
          </Link>
        }
      />
      <div className="grid gap-3 p-3 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Panel>
            <PanelHeader
              title="Baseline — Current State"
              accent="critical"
              meta={<span>{mode} SOURCE</span>}
            />
            <PanelBody className="space-y-2">
              <p className="font-mono text-sm font-semibold">
                {result?.zoneName ?? "No zone selected"}
              </p>
              <p className="font-mono text-4xl font-bold text-critical tabular-nums">
                {result ? `${Math.round(result.baselinePercent * 100)}%` : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                projected peak density
                {targetPrediction?.timeToCritical != null
                  ? ` in ${formatDuration(targetPrediction.timeToCritical)}`
                  : ""}{" "}
                without intervention.
              </p>
              <p className="border-t border-border pt-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                CURRENT OCCUPANCY{" "}
                {Math.round(
                  (crowd.zones.find((z) => z.id === targetId)?.occupancyPercent ?? 0) * 100,
                )}
                % · SELECT A ZONE IN THE TWIN TO RETARGET
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Available Interventions" meta={<span>SELECT TO MODEL</span>} />
            <PanelBody className="space-y-2">
              {catalogue.map((iv) => {
                const on = selected.includes(iv.id);
                return (
                  <label
                    key={iv.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 border px-2.5 py-2 transition-colors",
                      on ? "border-info bg-info/8" : "border-border hover:border-border-strong",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(iv.id)}
                      className="mt-0.5 size-3.5 accent-[var(--info)]"
                    />
                    <span className="min-w-0">
                      <span className="block font-mono text-[12px] font-semibold">
                        {iv.action}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {iv.assumption}
                      </span>
                    </span>
                  </label>
                );
              })}
            </PanelBody>
          </Panel>
        </div>

        <div className="space-y-3">
          <section className="border border-border bg-panel p-3">
            <h2 className="tech-label mb-3 text-foreground/85">Simulated Outcome</h2>
            {result ? (
              <>
                <BeforeAfterComparison result={result} />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {result.zones
                    .filter((z) => z.zoneId === targetId || z.deltaPoints !== 0)
                    .map((z) => (
                      <div
                        key={z.zoneId}
                        className="flex items-center justify-between border border-border bg-panel-raised px-3 py-2 font-mono text-[11px]"
                      >
                        <span>{z.zoneName}</span>
                        <span className="tabular-nums">
                          {Math.round(z.baselinePercent * 100)}% →{" "}
                          <span
                            className={
                              z.deltaPoints <= 0 ? "text-safe" : "text-moderate"
                            }
                          >
                            {Math.round(z.simulatedPercent * 100)}%
                          </span>
                        </span>
                      </div>
                    ))}
                </div>
                <details className="mt-3 border border-border bg-panel-raised px-3 py-2">
                  <summary className="cursor-pointer font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
                    MODEL ASSUMPTIONS
                  </summary>
                  <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    {result.assumptions.map((a) => (
                      <li key={a}>• {a}</li>
                    ))}
                  </ul>
                </details>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={selected.length === 0}
                    onClick={() => applyIntervention(selected)}
                    className="border border-safe bg-safe/15 px-5 py-2.5 font-mono text-xs font-bold tracking-[0.18em] text-safe transition-colors hover:bg-safe/25 disabled:opacity-40"
                  >
                    APPLY TO DIGITAL TWIN
                  </button>
                  {!result.computable ? (
                    <span className="font-mono text-[11px] text-moderate">
                      NO FLOW DATA FOR THIS ZONE — RELIEF CANNOT BE MODELLED
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                No zone state available from the current data source.
              </p>
            )}
          </section>

          {interventionApplied && result ? (
            <section className="alert-enter border border-safe/50 bg-safe/8 p-3">
              <h2 className="mb-2 flex items-center gap-2 font-mono text-xs font-bold tracking-[0.18em] text-safe">
                <CheckCircle2 className="size-4" aria-hidden /> INTERVENTION APPLIED — MODELLED
                VERIFICATION
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <Verified
                  label="Projected peak density"
                  value={`${Math.round(result.baselinePercent * 100)}% → ${Math.round(result.simulatedPercent * 100)}%`}
                />
                <Verified label="Risk" value={`${result.riskBefore} → ${result.riskAfter}`} />
                <Verified
                  label="Change"
                  value={`${result.deltaPoints >= 0 ? "−" : "+"}${Math.abs(result.deltaPoints)} percentage points`}
                />
              </div>
            </section>
          ) : null}

          <div className="relative h-[420px] overflow-hidden border border-border bg-[#0f131a]">
            <VenueCanvas
              className="block size-full"
              zones={crowd.zones}
              selectedZoneId={selectedZoneId}
              onSelectZone={selectZone}
              predictedZoneId={targetId}
              predictedPercent={result?.baselinePercent ?? 0}
              etaLabel={formatDuration(targetPrediction?.timeToCritical ?? null)}
              interventionApplied={interventionApplied}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Verified({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-panel-raised px-3 py-2">
      <p className="tech-label">{label}</p>
      <p className="font-mono text-sm font-bold">{value}</p>
    </div>
  );
}
