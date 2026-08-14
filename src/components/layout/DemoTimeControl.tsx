import { Pause, Play, RotateCcw } from "lucide-react";
import { useDemo, type Speed } from "@/state/demo-store";
import { SIM_WINDOW_SECONDS } from "@/data/demo/venue";
import { cn } from "@/lib/utils";

const SPEEDS: Speed[] = [1, 2, 5];

export function DemoTimeControl() {
  const { playing, toggle, reset, speed, setSpeed, clock, simSecond, seek, crowd } = useDemo();

  return (
    <div className="flex h-11 shrink-0 items-center gap-4 border-t border-border bg-panel px-4">
      <span className="tech-label">Simulation time</span>
      <time className="font-mono text-sm font-semibold tabular-nums">{clock.slice(0, 5)}</time>

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause simulation" : "Play simulation"}
        className="inline-flex items-center gap-1.5 border border-border-strong bg-panel-raised px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] transition-colors hover:border-info hover:text-info"
      >
        {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
        {playing ? "PAUSE" : "PLAY"}
      </button>

      <div className="flex items-center border border-border-strong" role="group" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            aria-pressed={speed === s}
            className={cn(
              "px-2 py-1 font-mono text-[10px] tracking-widest transition-colors",
              speed === s
                ? "bg-info/15 text-info"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s}×
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-1.5 border border-border-strong px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] text-muted-foreground transition-colors hover:border-info hover:text-info"
      >
        <RotateCcw className="size-3" />
        RESET
      </button>

      <label className="flex flex-1 items-center gap-3">
        <span className="sr-only">Scrub simulation time</span>
        <input
          type="range"
          min={0}
          max={SIM_WINDOW_SECONDS}
          step={1}
          value={simSecond}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none bg-secondary accent-[var(--info)]"
        />
      </label>

      <span className="tech-label whitespace-nowrap">
        PHASE — <span className="text-foreground">{crowd.phase.replace("_", " ")}</span>
      </span>
    </div>
  );
}
