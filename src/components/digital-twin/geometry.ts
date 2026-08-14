import type { FlowPath, WedgeShape, ZoneDefinition } from "@/types/venue";

export interface Pt {
  x: number;
  y: number;
}

export function polylineLength(points: Pt[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

/** point at normalised progress (0..1) along a polyline */
export function pointAt(points: Pt[], progress: number): Pt {
  const total = polylineLength(points);
  const target = Math.max(0, Math.min(1, progress)) * total;
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (travelled + seg >= target) {
      const k = seg === 0 ? 0 : (target - travelled) / seg;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    travelled += seg;
  }
  return points[points.length - 1] ?? { x: 0, y: 0 };
}

export function tracePath(ctx: CanvasRenderingContext2D, path: FlowPath) {
  const pts = path.points;
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length - 1; i++) {
    const cur = pts[i]!;
    const next = pts[i + 1]!;
    ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + next.x) / 2, (cur.y + next.y) / 2);
  }
  const last = pts[pts.length - 1]!;
  ctx.lineTo(last.x, last.y);
}

export function traceWedge(ctx: CanvasRenderingContext2D, w: WedgeShape) {
  ctx.beginPath();
  ctx.ellipse(w.cx, w.cy, w.rx, w.ry, 0, w.startAngle, w.endAngle);
  ctx.ellipse(
    w.cx,
    w.cy,
    w.rx * w.innerScale,
    w.ry * w.innerScale,
    0,
    w.endAngle,
    w.startAngle,
    true,
  );
  ctx.closePath();
}

function normaliseAngle(a: number, start: number): number {
  let angle = a;
  while (angle < start) angle += Math.PI * 2;
  while (angle > start + Math.PI * 2) angle -= Math.PI * 2;
  return angle;
}

export function hitTestZone(zones: ZoneDefinition[], p: Pt): ZoneDefinition | null {
  for (const zone of zones) {
    const g = zone.geometry;
    if (g.shape === "rect") {
      if (p.x >= g.x && p.x <= g.x + g.w && p.y >= g.y && p.y <= g.y + g.h) return zone;
    }
  }
  for (const zone of zones) {
    const g = zone.geometry;
    if (g.shape !== "wedge") continue;
    const nx = (p.x - g.cx) / g.rx;
    const ny = (p.y - g.cy) / g.ry;
    const r = Math.hypot(nx, ny);
    if (r > 1 || r < g.innerScale) continue;
    const angle = normaliseAngle(Math.atan2(ny, nx), g.startAngle);
    if (angle >= g.startAngle && angle <= g.endAngle) return zone;
  }
  return null;
}
