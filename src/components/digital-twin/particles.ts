import type { FlowPath } from "@/types/venue";
import { pointAt, polylineLength } from "./geometry";
import { PALETTE, rgba } from "@/lib/palette";

interface Particle {
  progress: number;
  speed: number;
  jitter: number;
  size: number;
}

export interface FlowSpec {
  /** number of particles to render for this path */
  count: number;
  /** 0..1 — congestion on the path, slows particles and warms their colour */
  congestion: number;
  color: string;
}

export class ParticleField {
  private pools = new Map<string, Particle[]>();

  private lengths = new Map<string, number>();

  constructor(private paths: FlowPath[]) {
    for (const path of paths) {
      this.lengths.set(path.id, polylineLength(path.points));
    }
  }

  private pool(pathId: string): Particle[] {
    let pool = this.pools.get(pathId);
    if (!pool) {
      pool = [];
      this.pools.set(pathId, pool);
    }
    return pool;
  }

  private resize(pathId: string, count: number) {
    const pool = this.pool(pathId);
    while (pool.length < count) {
      pool.push({
        progress: Math.random(),
        speed: 0.6 + Math.random() * 0.7,
        jitter: (Math.random() - 0.5) * 13,
        size: 1.5 + Math.random() * 1.4,
      });
    }
    if (pool.length > count) pool.length = count;
  }

  step(dt: number, specs: Record<string, FlowSpec>) {
    for (const path of this.paths) {
      const spec = specs[path.id];
      if (!spec) continue;
      this.resize(path.id, spec.count);
      const length = this.lengths.get(path.id) ?? 1;
      const slow = 1 - Math.min(0.78, spec.congestion * 0.85);
      const pool = this.pool(path.id);
      for (const p of pool) {
        p.progress += (dt * p.speed * 46 * slow) / length;
        if (p.progress > 1) p.progress -= 1;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, specs: Record<string, FlowSpec>) {
    for (const path of this.paths) {
      const spec = specs[path.id];
      if (!spec) continue;
      const pool = this.pool(path.id);
      ctx.fillStyle = rgba(spec.color, 0.9);
      for (const p of pool) {
        const pt = pointAt(path.points, p.progress);
        const y = pt.y + p.jitter * 0.5;
        const x = pt.x + p.jitter * 0.25;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      // faint trail head glow on the busiest routes
      if (spec.congestion > 0.6) {
        ctx.fillStyle = rgba(PALETTE.critical, 0.16);
        for (const p of pool) {
          const pt = pointAt(path.points, p.progress);
          ctx.beginPath();
          ctx.arc(pt.x + p.jitter * 0.25, pt.y + p.jitter * 0.5, p.size * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}
