import { useDemo } from "@/state/demo-store";
import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";

export function SystemHealthPanel() {
  const { crowd, mode } = useDemo();
  const items = [
    { label: "Crowd State", ok: crowd.health.crowdState },
    { label: "Prediction Engine", ok: crowd.health.predictionEngine },
    { label: "Risk Engine", ok: crowd.health.riskEngine },
    { label: "Digital Twin", ok: crowd.health.digitalTwin },
  ];

  return (
    <Panel>
      <PanelHeader title="System Health" meta={<span>{mode} DATA SOURCE</span>} />
      <PanelBody className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 border border-border bg-panel-raised px-2 py-1.5"
          >
            <span
              aria-hidden
              className={`size-1.5 rounded-full ${item.ok ? "bg-safe" : "bg-critical"}`}
            />
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase">
              {item.label}
            </span>
            <span className="sr-only">{item.ok ? "operational" : "degraded"}</span>
          </div>
        ))}
      </PanelBody>
    </Panel>
  );
}
