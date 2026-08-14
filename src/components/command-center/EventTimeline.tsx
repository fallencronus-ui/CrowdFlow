import { demoEvent, SIM_WINDOW_SECONDS } from "@/data/demo/venue";
import { useDemo } from "@/state/demo-store";
import { cn } from "@/lib/utils";

const START = -12240;
const END = SIM_WINDOW_SECONDS + 900;

const pos = (second: number) => ((second - START) / (END - START)) * 100;

export function EventTimeline() {
  const { simSecond, seek } = useDemo();
  const cursor = Math.max(0, Math.min(100, pos(simSecond)));

  return (
    <div className="border border-border bg-panel px-4 py-3">
      <div className="flex items-center justify-between">
        <h2 className="tech-label text-foreground/85">Event Timeline</h2>
        <span className="tech-label">Click a milestone to jump the simulation</span>
      </div>

      <div className="relative mt-5 h-14">
        <div className="absolute top-2 right-0 left-0 h-px bg-border" />
        <div
          className="absolute top-2 left-0 h-px bg-info/70 transition-[width] duration-300"
          style={{ width: `${cursor}%` }}
        />
        <div
          className="absolute top-0 z-10 -translate-x-1/2 transition-[left] duration-300"
          style={{ left: `${cursor}%` }}
        >
          <span className="block size-[9px] rotate-45 border border-info bg-info" />
        </div>

        {demoEvent.timeline.map((mark) => {
          const left = pos(mark.atSecond);
          const passed = simSecond >= mark.atSecond;
          const isExitSurge = mark.label === "Exit Surge";
          return (
            <button
              key={mark.time}
              type="button"
              onClick={() => seek(Math.max(0, mark.atSecond))}
              className="absolute top-0 -translate-x-1/2 text-center focus-visible:outline-2"
              style={{ left: `${left}%` }}
            >
              <span
                className={cn(
                  "mx-auto block size-2 rounded-full border",
                  passed
                    ? "border-info bg-info"
                    : isExitSurge
                      ? "border-high bg-high/30"
                      : "border-border-strong bg-panel",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "mt-2 block font-mono text-[11px] font-semibold tabular-nums",
                  passed ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {mark.time}
              </span>
              <span
                className={cn(
                  "block font-mono text-[9px] tracking-[0.14em] whitespace-nowrap uppercase",
                  isExitSurge ? "text-high" : "text-muted-foreground",
                )}
              >
                {mark.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
