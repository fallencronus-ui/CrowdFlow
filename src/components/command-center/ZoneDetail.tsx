import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { RiskBadge } from "@/components/common/RiskBadge";
import { DensityBar } from "@/components/common/DensityBar";
import { useDemo } from "@/state/demo-store";
import { formatDuration } from "@/data/demo/scenario";
import { riskTextClass } from "@/lib/palette";
import { cn } from "@/lib/utils";

export function ZoneDetail({ zoneId }: { zoneId: string }) {
  const { zoneById, predictionFor } = useDemo();
  const zone = zoneById(zoneId);
  if (!zone) return null;
  const prediction = predictionFor(zoneId);

  return (
    <Panel>
      <PanelHeader
        title={zone.name}
        meta={<RiskBadge level={zone.riskLevel} />}
        accent={zone.riskLevel === "CRITICAL" ? "critical" : "default"}
      />
      <PanelBody className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Cell label="Risk score" value={`${zone.riskScore} / 100`} tone={riskTextClass[zone.riskLevel]} />
          <Cell label="Capacity" value={`${zone.capacity.toLocaleString("en-IN")} people`} />
          <Cell label="Current density" value={`${Math.round(zone.occupancyPercent * 100)}%`} />
          <Cell
            label="Predicted density"
            value={
              prediction ? `${Math.round(prediction.predictedOccupancy * 100)}%` : "—"
            }
            tone={prediction ? riskTextClass[prediction.riskLevel] : undefined}
          />
          <Cell
            label="Time to critical"
            value={formatDuration(prediction?.timeToCritical ?? null)}
          />
          <Cell
            label="Flow"
            value={`${zone.growthRate >= 0 ? "+" : ""}${(zone.growthRate * 100).toFixed(1)}% / min`}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="tech-label">Occupancy</span>
            <span className="font-mono text-[11px] tabular-nums">
              {zone.currentOccupancy.toLocaleString("en-IN")} / {zone.capacity.toLocaleString("en-IN")}
            </span>
          </div>
          <DensityBar value={zone.occupancyPercent} className="mt-1.5" />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {zone.density.toFixed(2)} people/m² across {zone.area.toLocaleString("en-IN")} m².
        </p>
      </PanelBody>
    </Panel>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string | undefined;
}) {
  return (
    <div className="border border-border bg-panel-raised px-2 py-1.5">
      <p className="tech-label">{label}</p>
      <p className={cn("font-mono text-sm font-bold tabular-nums", tone)}>{value}</p>
    </div>
  );
}
