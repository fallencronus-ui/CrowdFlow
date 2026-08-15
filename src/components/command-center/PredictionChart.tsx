import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Prediction } from "@/types/prediction";
import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import { riskTextClass } from "@/lib/palette";
import { formatDuration } from "@/data/demo/scenario";
import { cn } from "@/lib/utils";

export function PredictionChart({
  prediction,
  compact,
}: {
  prediction: Prediction;
  compact?: boolean;
}) {
  const data = prediction.forecast.map((p) => ({
    label: p.label,
    observed: p.observed === null ? null : Math.round(p.observed * 100),
    predicted: p.predicted === null ? null : Math.round(p.predicted * 100),
  }));

  return (
    <Panel className="min-h-0">
      <PanelHeader
        title={`${prediction.zoneName} — Density Forecast`}
        meta={
          <span className="flex items-center gap-3">
            <LegendDot className="bg-info" label="Observed" />
            <LegendDot className="bg-critical" label="Predicted" dashed />
            <span className="text-muted-foreground">
              THRESHOLD {Math.round(prediction.capacityThreshold * 100)}%
            </span>
          </span>
        }
      />
      <PanelBody className="flex min-h-0 flex-col gap-3">
        <div className="grid grid-cols-4 gap-2">
          <Kpi label="Current" value={`${Math.round(prediction.currentOccupancy * 100)}%`} />
          <Kpi
            label={`Predicted +${prediction.horizonMinutes.toFixed(1)}m`}
            value={`${Math.round(prediction.predictedOccupancy * 100)}%`}
            tone={riskTextClass[prediction.riskLevel]}
          />
          <Kpi label="ETA to critical" value={formatDuration(prediction.timeToCritical)} />
          <Kpi label="Confidence" value={`${Math.round(prediction.confidence * 100)}%`} />
        </div>

        <div className={compact ? "h-40" : "h-52"}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="obsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--info)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--info)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine
                y={Math.round(prediction.capacityThreshold * 100)}
                stroke="var(--critical)"
                strokeDasharray="4 4"
                label={{
                  value: "CRITICAL",
                  position: "insideTopRight",
                  fill: "var(--critical)",
                  fontSize: 9,
                  fontFamily: "monospace",
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--panel-raised)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 2,
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(value: number | string, name: string) => [`${value}%`, name]}
              />
              <Area
                type="monotone"
                dataKey="observed"
                stroke="var(--info)"
                strokeWidth={2}
                fill="url(#obsFill)"
                connectNulls
                isAnimationActive={false}
                name="Observed"
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="var(--critical)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 2.5, fill: "var(--critical)" }}
                connectNulls
                isAnimationActive={false}
                name="Predicted"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </PanelBody>
    </Panel>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-border bg-panel-raised px-2 py-1.5">
      <p className="tech-label">{label}</p>
      <p className={cn("font-mono text-base font-bold tabular-nums", tone)}>{value}</p>
    </div>
  );
}

function LegendDot({
  className,
  label,
  dashed,
}: {
  className: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn("inline-block h-0.5 w-4", className, dashed && "opacity-80")}
      />
      {label}
    </span>
  );
}
