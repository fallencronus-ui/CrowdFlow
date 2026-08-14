import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { RiskRing } from "@/components/common/RiskRing";
import { RiskBadge } from "@/components/common/RiskBadge";
import { DensityBar } from "@/components/common/DensityBar";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { useDemo } from "@/state/demo-store";
import { formatDuration } from "@/data/demo/scenario";
import { cn } from "@/lib/utils";
import { riskTextClass } from "@/lib/palette";

export function RiskMonitor() {
  const { predictions, selectZone, selectedZoneId } = useDemo();
  const ranked = [...predictions].sort((a, b) => b.riskScore - a.riskScore);
  const top = ranked[0];
  const rest = ranked.slice(1, 6);
  if (!top) return null;

  return (
    <Panel className="min-h-0">
      <PanelHeader
        title="Risk Monitor"
        accent={top.riskLevel === "CRITICAL" ? "critical" : "default"}
        meta={<span>RANKED BY PREDICTED RISK</span>}
      />
      <PanelBody className="flex min-h-0 flex-col gap-4 overflow-auto">
        <button
          type="button"
          onClick={() => selectZone(top.zoneId)}
          className="flex flex-col items-center gap-2 border border-border bg-panel-raised p-3 text-left transition-colors hover:border-info"
        >
          <div className="flex w-full items-center justify-between">
            <RiskBadge level={top.riskLevel} size="md" />
            <span className="tech-label">HIGHEST RISK ZONE</span>
          </div>
          <p className="w-full font-mono text-xl font-bold tracking-[0.08em] uppercase">
            {top.zoneName}
          </p>
          <RiskRing score={top.riskScore} level={top.riskLevel} />
          <div className="grid w-full grid-cols-3 gap-2 border-t border-border pt-3">
            <Stat label="Current" value={`${Math.round(top.currentOccupancy * 100)}%`} />
            <Stat
              label="Predicted"
              value={`${Math.round(top.predictedOccupancy * 100)}%`}
              tone={riskTextClass[top.riskLevel]}
            />
            <Stat label="To critical" value={formatDuration(top.timeToCritical)} />
          </div>
        </button>

        <div className="space-y-1.5">
          <p className="tech-label">Other monitored zones</p>
          {rest.map((p) => (
            <button
              key={p.zoneId}
              type="button"
              onClick={() => selectZone(p.zoneId)}
              className={cn(
                "flex w-full items-center gap-3 border border-border px-2.5 py-2 text-left transition-colors hover:border-info",
                selectedZoneId === p.zoneId && "border-info bg-info/5",
              )}
            >
              <span className="w-28 shrink-0 truncate font-mono text-[11px] font-semibold uppercase">
                {p.zoneName}
              </span>
              <span className="flex-1">
                <DensityBar value={p.riskScore / 100} height="h-1.5" />
              </span>
              <span
                className={cn(
                  "w-16 shrink-0 text-right font-mono text-[10px] tracking-widest",
                  riskTextClass[p.riskLevel],
                )}
              >
                {p.riskLevel}
              </span>
              <span className="w-7 shrink-0 text-right font-mono text-sm font-bold tabular-nums">
                <AnimatedNumber value={p.riskScore} />
              </span>
            </button>
          ))}
        </div>
      </PanelBody>
    </Panel>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="text-center">
      <p className="tech-label">{label}</p>
      <p className={cn("font-mono text-sm font-bold tabular-nums", tone)}>{value}</p>
    </div>
  );
}
