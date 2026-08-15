import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { buildInterventions, runScenario } from "@/lib/simulationModel";
import { useDemo } from "@/state/demo-store";

export function InterventionPanel() {
  const { crowd, predictions, selectedZoneId, focusZoneId, mode } = useDemo();
  const targetId = selectedZoneId ?? focusZoneId;
  const options = buildInterventions(crowd.zones, targetId).slice(0, 3);

  return (
    <Panel className="min-h-0">
      <PanelHeader
        title="Recommended Action"
        meta={<span>OPERATOR DECISION SUPPORT · {mode}</span>}
      />
      <PanelBody className="flex min-h-0 flex-col gap-2 overflow-auto">
        {options.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No zone state available from the current data source, so no intervention can be
            recommended.
          </p>
        ) : null}

        {options.map((iv) => {
          const projected = runScenario(crowd.zones, predictions, targetId, [iv.id]);
          return (
            <article
              key={iv.id}
              className="border border-border bg-panel-raised px-2.5 py-2 transition-colors hover:border-info"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] tracking-[0.16em] text-info">
                  PRIORITY {iv.priority}
                </span>
                <span className="tech-label">{iv.type.replace("_", " ")}</span>
              </div>
              <p className="mt-1 font-mono text-[13px] font-semibold">{iv.action}</p>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Modelled effect:{" "}
                  <span className={projected?.computable ? "text-safe" : "text-muted-foreground"}>
                    {projected?.computable
                      ? `−${projected.deltaPoints} pp peak density`
                      : "N/A — insufficient signal"}
                  </span>
                </span>
                <span className="font-mono">{iv.receivingZoneName ?? "HOLD OUTSIDE"}</span>
              </div>
            </article>
          );
        })}

        <Link
          to="/simulator"
          className="mt-1 inline-flex items-center justify-center gap-2 border border-info bg-info/15 px-4 py-2.5 font-mono text-xs font-bold tracking-[0.18em] text-info transition-colors hover:bg-info/25"
        >
          SIMULATE INTERVENTION
          <ArrowRight className="size-3.5" />
        </Link>
        <p className="text-center text-[10px] text-muted-foreground">
          Nothing is applied until it is simulated and verified in the digital twin.
        </p>
      </PanelBody>
    </Panel>
  );
}
