import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { DensityBar } from "@/components/common/DensityBar";
import { RiskBadge } from "@/components/common/RiskBadge";
import type { RiskLevel } from "@/types/crowd";
import type { ScenarioResult } from "@/lib/simulationModel";

export function BeforeAfterComparison({ result }: { result: ScenarioResult }) {
  const improved = result.deltaPoints > 0;
  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_220px]">
        <Column
          title="Without intervention"
          value={result.baselinePercent}
          tone="critical"
          level={result.riskBefore}
        />
        <Column
          title="With intervention"
          value={result.simulatedPercent}
          tone="safe"
          level={result.riskAfter}
        />
        <div
          className={`flex flex-col justify-center border px-4 py-3 ${
            improved ? "border-safe/40 bg-safe/8" : "border-border bg-panel-raised"
          }`}
        >
          <p className="tech-label">Modelled change</p>
          <p
            className={`font-mono text-3xl font-bold tabular-nums ${
              improved ? "text-safe" : "text-muted-foreground"
            }`}
          >
            {improved ? "−" : ""}
            <AnimatedNumber value={Math.abs(result.deltaPoints)} />
            <span className="ml-1 text-sm">pp</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {improved ? (
              <>
                Projected peak density reduced by{" "}
                <span className="text-foreground">{result.improvementPercent.toFixed(1)}%</span>
              </>
            ) : (
              "Select an intervention to model a change."
            )}
          </p>
          <p className="mt-2 flex items-center gap-2 font-mono text-[11px]">
            <RiskBadge level={result.riskBefore} />
            <span aria-hidden>→</span>
            <RiskBadge level={result.riskAfter} />
          </p>
        </div>
      </div>
      <p className="border-t border-border pt-2 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
        SIMULATED / PREDICTED EFFECT — {result.zoneName.toUpperCase()} ·{" "}
        {result.horizonMinutes}-MIN HORIZON · NOT A MEASURED OUTCOME
      </p>
    </div>
  );
}

function Column({
  title,
  value,
  tone,
  level,
}: {
  title: string;
  value: number;
  tone: "critical" | "safe";
  level: RiskLevel;
}) {
  return (
    <div className="border border-border bg-panel-raised px-4 py-3">
      <p className="tech-label">{title}</p>
      <p
        className={`font-mono text-4xl font-bold tabular-nums ${
          tone === "critical" ? "text-critical" : "text-safe"
        }`}
      >
        <AnimatedNumber value={value * 100} suffix="%" />
      </p>
      <DensityBar
        value={value}
        className="mt-2"
        tone={tone === "critical" ? "critical" : "safe"}
        height="h-2.5"
      />
      <p className="mt-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
        PEAK RISK — {level}
      </p>
    </div>
  );
}
