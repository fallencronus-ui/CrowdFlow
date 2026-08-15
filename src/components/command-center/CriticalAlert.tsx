import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useDemo } from "@/state/demo-store";
import { formatDuration } from "@/data/demo/scenario";

export function CriticalAlert() {
  const { predictions, interventionApplied } = useDemo();
  const top = [...predictions].sort((a, b) => b.riskScore - a.riskScore)[0];
  if (!top) return null;

  if (interventionApplied) {
    return (
      <div className="alert-enter flex items-center gap-4 border border-safe/50 bg-safe/10 px-4 py-2.5">
        <ShieldCheck className="size-5 shrink-0 text-safe" aria-hidden />
        <p className="font-mono text-sm font-bold tracking-[0.1em] text-safe">
          INTERVENTION ACTIVE — {top.zoneName.toUpperCase()} STABILISING
        </p>
        <p className="ml-auto font-mono text-xs text-muted-foreground">
          PREDICTED {Math.round(top.predictedOccupancy * 100)}% · RISK {top.riskScore}/100 ·{" "}
          {top.riskLevel}
        </p>
      </div>
    );
  }

  if (top.riskLevel !== "CRITICAL" && top.riskLevel !== "HIGH") {
    return (
      <div className="flex items-center gap-4 border border-border bg-panel px-4 py-2.5">
        <span className="size-2 rounded-full bg-safe" aria-hidden />
        <p className="font-mono text-sm tracking-[0.1em] text-muted-foreground">
          NOMINAL — NO BOTTLENECK PREDICTED WITHIN THE FORECAST HORIZON
        </p>
      </div>
    );
  }

  const critical = top.riskLevel === "CRITICAL";

  return (
    <div
      role="status"
      className={`alert-enter flex flex-wrap items-center gap-x-6 gap-y-2 border px-4 py-2.5 ${
        critical ? "border-critical/60 bg-critical/10" : "border-high/50 bg-high/10"
      }`}
    >
      <AlertTriangle
        className={`size-5 shrink-0 ${critical ? "scan-pulse text-critical" : "text-high"}`}
        aria-hidden
      />
      <p
        className={`font-mono text-sm font-bold tracking-[0.12em] ${
          critical ? "text-critical" : "text-high"
        }`}
      >
        {top.riskLevel} — {top.zoneName.toUpperCase()}
      </p>
      <p className="font-mono text-xs text-foreground/85">
        Bottleneck predicted in {formatDuration(top.timeToCritical)}
      </p>
      <div className="ml-auto flex items-center gap-6">
        <Metric label="Predicted density" value={`${Math.round(top.predictedOccupancy * 100)}%`} />
        <Metric label="Risk score" value={`${top.riskScore} / 100`} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-right">
      <span className="tech-label block">{label}</span>
      <span className="font-mono text-base font-bold tabular-nums">{value}</span>
    </span>
  );
}
