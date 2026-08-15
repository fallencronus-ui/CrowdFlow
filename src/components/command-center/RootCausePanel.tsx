import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { buildRiskExplanation, type DriverLevel } from "@/lib/riskDrivers";
import { useDemo } from "@/state/demo-store";
import { cn } from "@/lib/utils";

const TONE: Record<DriverLevel, string> = {
  HIGH: "bg-critical",
  MEDIUM: "bg-high",
  LOW: "bg-safe",
  UNAVAILABLE: "bg-muted-foreground/40",
};

const TEXT: Record<DriverLevel, string> = {
  HIGH: "text-critical",
  MEDIUM: "text-high",
  LOW: "text-safe",
  UNAVAILABLE: "text-muted-foreground",
};

export function RootCausePanel({ zoneId }: { zoneId: string }) {
  const { crowd, predictions, hotspots, mode } = useDemo();
  const zone = crowd.zones.find((z) => z.id === zoneId);
  const prediction = predictions.find((p) => p.zoneId === zoneId);
  const hotspot = hotspots.find((h) => h.zoneId === zoneId);
  const analysis = buildRiskExplanation(
    zone,
    prediction,
    hotspot
      ? { observations: hotspot.incidents, total: Math.max(hotspot.incidents, 1) }
      : undefined,
  );


  return (
    <Panel className="min-h-0">
      <PanelHeader
        title={`Why is ${analysis.zoneName} at risk?`}
        meta={<span>RANKED RISK DRIVERS · {mode}</span>}
      />
      <PanelBody className="flex min-h-0 flex-col gap-2 overflow-auto">
        {analysis.drivers.map((driver, index) => (
          <div
            key={driver.id}
            className={cn(
              "grid grid-cols-[24px_1fr_64px] items-center gap-3 border border-transparent px-2 py-1.5",
              driver.level === "UNAVAILABLE" && "opacity-70",
            )}
          >
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-mono text-[12px] font-semibold tracking-wide">
                {driver.label}
              </span>
              <span className="mt-1 block h-1.5 w-full bg-secondary">
                <span
                  className={cn(
                    "block h-full origin-left transition-[width] duration-700",
                    TONE[driver.level],
                  )}
                  style={{ width: `${driver.weight}%` }}
                />
              </span>
              <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                {driver.detail}
              </span>
            </span>
            <span
              className={cn(
                "text-right font-mono text-sm font-bold tabular-nums",
                TEXT[driver.level],
              )}
            >
              {driver.value}
            </span>
          </div>
        ))}
        <p className="mt-1 border-t border-border pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-mono text-[10px] tracking-[0.14em] text-foreground/80">
            PRIMARY CONTRIBUTOR —{" "}
          </span>
          {analysis.summary}
        </p>
      </PanelBody>
    </Panel>
  );
}
