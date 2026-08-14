import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { useDemo } from "@/state/demo-store";

export function CrowdReports() {
  const { crowd } = useDemo();
  const { reports } = crowd;

  return (
    <Panel>
      <PanelHeader title="Crowd Reports" meta={<span>CORROBORATION SIGNAL</span>} />
      <PanelBody className="space-y-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-mono text-sm font-bold text-foreground">
            {reports.reports} reports
          </span>{" "}
          corroborate high density in Corridor C.
        </p>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className={`size-2.5 rounded-full ${
                i < reports.reports ? "bg-info" : "bg-secondary"
              }`}
            />
          ))}
        </div>
        <dl className="space-y-1.5 border-t border-border pt-2.5">
          <Line label="CCTV confidence" value={`${Math.round(reports.cctvConfidence * 100)}%`} />
          <Line
            label="Simulation confidence"
            value={`${Math.round(reports.simulationConfidence * 100)}%`}
          />
          <Line label="Historical confidence" value={reports.historicalConfidence} />
        </dl>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Reports are a corroborating signal only. Risk is derived from observed density,
          flow and historical models.
        </p>
      </PanelBody>
    </Panel>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="tech-label">{label}</dt>
      <dd className="font-mono text-xs font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
