import { cn } from "@/lib/utils";
import { riskBgClass } from "@/lib/palette";
import type { RiskLevel } from "@/types/crowd";

export function RiskBadge({
  level,
  className,
  size = "sm",
}: {
  level: RiskLevel;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border font-mono uppercase tracking-widest",
        riskBgClass[level],
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-1.5 rounded-full bg-current",
          level === "CRITICAL" && "scan-pulse",
        )}
      />
      {level}
    </span>
  );
}
