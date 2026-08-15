import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { PredictionChart } from "@/components/command-center/PredictionChart";
import { RiskBadge } from "@/components/common/RiskBadge";
import { useDemo } from "@/state/demo-store";
import { formatDuration } from "@/data/demo/scenario";
import type { RiskLevel } from "@/types/crowd";
import { cn } from "@/lib/utils";

const FILTERS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "Predictions — CrowdFlow Intelligence" },
      {
        name: "description",
        content:
          "Zone-level crowd density forecasts with growth rate, time to critical threshold and model confidence.",
      },
      { property: "og:title", content: "Predictions — CrowdFlow Intelligence" },
      {
        property: "og:description",
        content: "Predictive crowd density analytics for every monitored venue zone.",
      },
    ],
  }),
  component: PredictionsPage,
});

function PredictionsPage() {
  const { predictions, selectZone, selectedZoneId } = useDemo();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const rows = predictions.filter((p) => filter === "ALL" || p.riskLevel === filter);
  const focus = predictions.find((p) => p.zoneId === selectedZoneId) ?? predictions[0];

  return (
    <AppShell>
      <PageHeader
        title="Predictions"
        subtitle="Forecast horizon 2.3 minutes — every zone, ranked by predicted risk."
        actions={
          <div className="flex border border-border-strong" role="group" aria-label="Filter by risk">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 font-mono text-[10px] tracking-[0.14em]",
                  filter === f ? "bg-info/15 text-info" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />
      <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="overflow-x-auto border border-border bg-panel">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                {["Zone", "Current", "Capacity", "Predicted", "ETA", "Growth", "Risk", "Conf."].map(
                  (h) => (
                    <th key={h} className="tech-label px-3 py-2 font-normal">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.zoneId}
                  onClick={() => selectZone(p.zoneId)}
                  className={cn(
                    "cursor-pointer border-b border-border/60 font-mono text-xs transition-colors hover:bg-panel-raised",
                    selectedZoneId === p.zoneId && "bg-info/5",
                  )}
                >
                  <td className="px-3 py-2.5 font-semibold">{p.zoneName}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {Math.round(p.currentOccupancy * 100)}%
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                    {Math.round(p.capacityThreshold * 100)}%
                  </td>
                  <td className="px-3 py-2.5 font-bold tabular-nums">
                    {Math.round(p.predictedOccupancy * 100)}%
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{formatDuration(p.timeToCritical)}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {p.growthRate >= 0 ? "+" : ""}
                    {(p.growthRate * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-2.5">
                    <RiskBadge level={p.riskLevel as RiskLevel} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{Math.round(p.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {focus ? <PredictionChart prediction={focus} /> : null}
      </div>
    </AppShell>
  );
}
