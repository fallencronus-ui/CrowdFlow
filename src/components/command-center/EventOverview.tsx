import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { DensityBar } from "@/components/common/DensityBar";
import { useDemo } from "@/state/demo-store";
import { demoEvent } from "@/data/demo/venue";
import { formatDuration } from "@/data/demo/scenario";

export function EventOverview() {
  const { crowd } = useDemo();

  return (
    <Panel>
      <PanelHeader title="Event Overview" meta={<span>{demoEvent.city.toUpperCase()}</span>} />
      <PanelBody className="space-y-3.5">
        <div>
          <p className="font-mono text-sm font-semibold tracking-wide">{demoEvent.name}</p>
          <p className="text-xs text-muted-foreground">{demoEvent.venueName}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Attendees"
            value={<AnimatedNumber value={crowd.totalAttendees} />}
          />
          <Metric label="Current crowd" value={<AnimatedNumber value={crowd.currentCrowd} />} />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="tech-label">Venue utilization</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              <AnimatedNumber value={crowd.venueUtilization * 100} decimals={1} suffix="%" />
            </span>
          </div>
          <DensityBar value={crowd.venueUtilization} className="mt-1.5" tone="info" />
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-border pt-3">
          <Row label="Event state" value={crowd.eventState.replace("_", " ")} />
          <Row
            label="Exit surge"
            value={crowd.exitSurgeLevel}
            tone={crowd.exitSurgeLevel === "HIGH" ? "text-high" : undefined}
          />
          <Row label="Time to event end" value={formatDuration(crowd.secondsToEventEnd)} />
          <Row label="Local time" value={crowd.clock} />
        </dl>

        {crowd.secondsToEventEnd < 400 ? (
          <p className="border border-high/40 bg-high/10 px-2.5 py-2 font-mono text-[11px] tracking-[0.14em] text-high">
            ▲ EXIT SURGE IMMINENT
          </p>
        ) : null}
      </PanelBody>
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border border-border bg-panel-raised px-2.5 py-2">
      <p className="tech-label">{label}</p>
      <p className="font-mono text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string | undefined;
}) {
  return (
    <div>
      <dt className="tech-label">{label}</dt>
      <dd className={`font-mono text-xs font-semibold ${tone ?? "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}
