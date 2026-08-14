import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { useDemo } from "@/state/demo-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/infrastructure")({
  head: () => ({
    meta: [
      { title: "Infrastructure Intelligence — CrowdFlow Intelligence" },
      {
        name: "description",
        content:
          "Turn recurring crowd failures into permanent infrastructure decisions: ranked venue redesign recommendations with modelled impact.",
      },
      { property: "og:title", content: "Infrastructure Intelligence — CrowdFlow Intelligence" },
      {
        property: "og:description",
        content: "Turn recurring crowd failures into infrastructure decisions.",
      },
    ],
  }),
  component: InfrastructurePage,
});

function InfrastructurePage() {
  const { hotspots, infrastructure, mode } = useDemo();
  const worst = hotspots[0];

  return (
    <AppShell>
      <PageHeader
        title="Infrastructure Intelligence"
        subtitle="Which recurring crowd problems suggest a physical or operational improvement?"
        actions={
          <span className="tech-label">
            {mode === "LIVE" ? "DERIVED FROM PIPELINE OBSERVATIONS" : "DERIVED FROM DEMO RECORD"}
          </span>
        }
      />
      <div className="grid gap-3 p-3 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title={worst?.zoneName ?? "No recurring hotspot"}
            accent={worst?.infrastructureRisk === "HIGH" ? "critical" : "default"}
          />
          <PanelBody className="space-y-3">
            {worst ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Big value={`${worst.incidents}`} label={worst.unitLabel ?? "incidents"} />
                  <Big
                    value={
                      worst.exitSurgeShare === null
                        ? "N/A"
                        : `${Math.round(worst.exitSurgeShare * 100)}%`
                    }
                    label="during exit surges"
                  />
                  <Big
                    value={worst.infrastructureRisk}
                    label="infrastructure risk"
                    tone={
                      worst.infrastructureRisk === "HIGH" ? "text-critical" : "text-moderate"
                    }
                  />
                </div>
                <div>
                  <p className="tech-label mb-1.5">Observed signals</p>
                  <ul className="space-y-1">
                    {(
                      infrastructure.find((r) => r.zoneId === worst.zoneId)?.factors ?? [
                        `${worst.incidents} ${worst.unitLabel ?? "incidents"} recorded`,
                      ]
                    ).map((f) => (
                      <li
                        key={f}
                        className="border border-border bg-panel-raised px-2.5 py-1.5 font-mono text-[11px]"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                No recurring hotspot has been recorded yet. Run the analysis pipeline to build
                an observation history.
              </p>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Recommendations" meta={<span>HYPOTHESES — NOT CERTAINTIES</span>} />
          <PanelBody className="space-y-2">
            {infrastructure.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No recommendation can be derived: the data source reports no recurring
                high-density zones.
              </p>
            ) : (
              infrastructure.map((rec, i) => (
                <article key={rec.id} className="border border-border bg-panel-raised px-3 py-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
                        REC {String(i + 1).padStart(2, "0")} · {rec.zoneId.toUpperCase()}
                      </p>
                      <h3 className="mt-0.5 font-mono text-sm font-semibold">{rec.title}</h3>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        {rec.rationale}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {rec.factors.map((f) => (
                          <span
                            key={f}
                            className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tech-label">Potential impact</p>
                      <p
                        className={cn(
                          "font-mono text-sm font-bold",
                          rec.impact === "HIGH" ? "text-safe" : "text-moderate",
                        )}
                      >
                        {rec.impact}
                      </p>
                      <p className="tech-label mt-1.5">Effort</p>
                      <p className="font-mono text-xs">{rec.effort}</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </PanelBody>
        </Panel>
      </div>
    </AppShell>
  );
}

function Big({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div className="border border-border bg-panel-raised px-2 py-2 text-center">
      <p className={cn("truncate font-mono text-lg font-bold", tone)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
