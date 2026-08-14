import { cn } from "@/lib/utils";

export function DensityBar({
  value,
  threshold,
  tone = "auto",
  className,
  height = "h-2",
}: {
  /** 0..1 */
  value: number;
  /** 0..1 critical marker */
  threshold?: number;
  tone?: "auto" | "safe" | "moderate" | "high" | "critical" | "info";
  className?: string;
  height?: string;
}) {
  const resolved =
    tone !== "auto"
      ? tone
      : value >= 0.8
        ? "critical"
        : value >= 0.62
          ? "high"
          : value >= 0.45
            ? "moderate"
            : "safe";
  const bg = {
    safe: "bg-safe",
    moderate: "bg-moderate",
    high: "bg-high",
    critical: "bg-critical",
    info: "bg-info",
  }[resolved];

  return (
    <div className={cn("relative w-full overflow-hidden bg-secondary", height, className)}>
      <div
        className={cn("h-full origin-left transition-[width] duration-700 ease-out", bg)}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
      {threshold !== undefined ? (
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/60"
          style={{ left: `${threshold * 100}%` }}
        />
      ) : null}
    </div>
  );
}
