import type { RiskLevel } from "@/types/crowd";
import { AnimatedNumber } from "./AnimatedNumber";

const COLOR: Record<RiskLevel, string> = {
  LOW: "var(--safe)",
  MEDIUM: "var(--moderate)",
  HIGH: "var(--high)",
  CRITICAL: "var(--critical)",
};

export function RiskRing({
  score,
  level,
  size = 150,
  label = "RISK SCORE",
}: {
  score: number;
  level: RiskLevel;
  size?: number;
  label?: string;
}) {
  const stroke = 9;
  const r = (size - stroke) / 2 - 6;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r + 9}
          fill="none"
          stroke={COLOR[level]}
          strokeOpacity={0.18}
          strokeWidth={1}
          strokeDasharray="2 6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={COLOR[level]}
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 600ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedNumber
          value={score}
          className="font-mono text-4xl font-bold tabular-nums"
        />
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
          / 100
        </span>
        <span className="mt-1 font-mono text-[9px] tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
