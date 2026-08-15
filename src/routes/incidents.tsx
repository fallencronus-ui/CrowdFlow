import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { useDemo } from "@/state/demo-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/incidents")({
  head: () => ({
    meta: [
      { title: "Historical Hotspots — CrowdFlow Intelligence" },
      {
        name: "description",
        content:
          "Recurring congestion incidents by zone — the evidence base that turns crowd failures into infrastructure decisions.",
      },
      { property: "og:title", content: "Historical Hotspots — CrowdFlow Intelligence" },
      {
        property: "og:description",
        content: "Recurring congestion reveals infrastructure problems.",
      },
    ],
  }),
  component: IncidentsPage,
});

function IncidentsPage() {
  const { hotspots, incidents, mode } = useDemo();
  const [zoneId, setZoneId] = useState<string | null>(null);

  useEffect(() => {
    if (hotspots.length && !hotspots.some((h) => h.zoneId === zoneId)) {
      setZoneId(hotspots[0]!.zoneId);
    }
  }, [hotspots, zoneId]);

  const hotspot = hotspots.find((h) => h.zoneId === zoneId) ?? hotspots[0];
  const max = Math.max(1, ...hotspots.map((h) => h.incidents));
  const related = hotspot ? incidents.filter((i) => i.zoneId === hotspot.zoneId) : [];
  const unit = hotspot?.unitLabel ?? "incidents";

  return (
    <AppShell>
      <PageHeader
        title="Historical Hotspots"
        subtitle="Recurring congestion reveals infrastructure problems."
        actions={
          <span className="tech-label">
            {mode === "LIVE" ? "SOURCE — ANALYSIS PIPELINE TIMELINE" : "SOURCE — DEMO RECORD"}
          </span>
        }
      />

      {!hotspot ? (
        <div className="p-6">
          <div className="border border-border bg-panel px-4 py-6 text-center">
            <p className="font-mono text-sm font-bold tracking-[0.16em] text-moderate">
              NO HISTORICAL DATA AVAILABLE
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Run the CrowdFlow analysis pipeline to generate a timeline of crowd
              observations, or switch to DEMO mode.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-3 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Panel>
            <PanelHeader title="Recurrence Ranking" meta={<span>{unit.toUpperCase()}</span>} />
            <PanelBody className="space-y-2">
              {hotspots.map((h, i) => (
                <button
                  key={h.zoneId}
                  type="button"
                  onClick={() => setZoneId(h.zoneId)}
                  className={cn(
                    "flex w-full items-center gap-3 border px-2.5 py-2 text-left transition-colors",
                    h.zoneId === hotspot.zoneId
                      ? "border-info bg-info/8"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[12px] font-semibold">{h.zoneName}</span>
                    <span className="mt-1 block h-1.5 bg-secondary">
                      <span
                        className={cn(
                          "block h-full transition-[width] duration-700",
                          h.severity === "HIGH"
                            ? "bg-critical"
                            : h.severity === "MEDIUM"
                              ? "bg-moderate"
                              : "bg-safe",
                        )}
                        style={{ width: `${(h.incidents / max) * 100}%` }}
                      />
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-sm font-bold tabular-nums">
                      {h.incidents}
                    </span>
                    <span className="tech-label">{h.severity}</span>
                  </span>
                </button>
              ))}
            </PanelBody>
          </Panel>

          <div className="space-y-3">
            <Panel>
              <PanelHeader
                title={`${hotspot.zoneName} — ${hotspot.incidents} ${unit}`}
                accent={hotspot.infrastructureRisk === "HIGH" ? "critical" : "default"}
              />
              <PanelBody className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-4">
                  <Stat
                    value={
                      hotspot.exitSurgeShare === null
                        ? "N/A"
                        : `${Math.round(hotspot.exitSurgeShare * 100)}%`
                    }
                    label="occurred during exit surges"
                  />
                  <Stat
                    value={
                      hotspot.averageDurationMinutes !== null
                        ? `${hotspot.averageDurationMinutes} min`
                        : (hotspot.averageDurationLabel ?? "N/A")
                    }
                    label="average congestion duration"
                  />
                  <Stat value={hotspot.primaryInflowSource ?? "N/A"} label="primary inflow source" />
                  <Stat value={hotspot.frequentObstruction ?? "N/A"} label="frequent obstruction" />
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={hotspot.trend}
                      margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="period"
                        tick={{
                          fill: "var(--muted-foreground)",
                          fontSize: 10,
                          fontFamily: "monospace",
                        }}
                        axisLine={{ stroke: "var(--border)" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{
                          fill: "var(--muted-foreground)",
                          fontSize: 10,
                          fontFamily: "monospace",
                        }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          background: "var(--panel-raised)",
                          border: "1px solid var(--border-strong)",
                          fontFamily: "monospace",
                          fontSize: 11,
                        }}
                      />
                      <Bar dataKey="incidents" fill="var(--high)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p
                  className={cn(
                    "border px-3 py-2 font-mono text-xs font-bold tracking-[0.16em]",
                    hotspot.infrastructureRisk === "HIGH"
                      ? "border-critical/50 bg-critical/10 text-critical"
                      : "border-moderate/40 bg-moderate/10 text-moderate",
                  )}
                >
                  INFRASTRUCTURE RISK — {hotspot.infrastructureRisk}
                </p>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Observation Log" />
              <PanelBody className="space-y-1.5">
                {related.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">
                    No high-density observations recorded for this zone.
                  </p>
                ) : (
                  related.map((inc) => (
                    <div
                      key={inc.id}
                      className="grid grid-cols-[110px_1fr_80px_80px] items-center gap-3 border-b border-border/60 py-1.5 font-mono text-[11px] last:border-0"
                    >
                      <span className="text-muted-foreground">{inc.date}</span>
                      <span className="truncate">
                        {inc.eventName} —{" "}
                        <span className="text-muted-foreground">{inc.trigger}</span>
                      </span>
                      <span className="tabular-nums">
                        {Math.round(inc.peakDensity * 100)}% peak
                      </span>
                      <span className="text-right tabular-nums">
                        {inc.durationLabel ?? `${inc.durationMinutes}m`}
                      </span>
                    </div>
                  ))
                )}
              </PanelBody>
            </Panel>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-border bg-panel-raised px-2.5 py-2">
      <p className="truncate font-mono text-lg font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
