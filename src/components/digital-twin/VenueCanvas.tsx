import { useEffect, useRef } from "react";
import type { Zone } from "@/types/crowd";
import { demoVenue } from "@/data/demo/venue";
import { densityColor, PALETTE, rgba } from "@/lib/palette";
import { hitTestZone, tracePath, traceWedge } from "./geometry";
import { ParticleField, type FlowSpec } from "./particles";

interface VenueCanvasProps {
  zones: Zone[];
  selectedZoneId: string | null;
  onSelectZone?: (zoneId: string) => void;
  predictedZoneId?: string;
  predictedPercent?: number;
  etaLabel?: string;
  interventionApplied: boolean;
  className?: string;
}

interface Frame extends VenueCanvasProps {}

export function VenueCanvas(props: VenueCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<Frame>(props);
  frameRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const field = new ParticleField(demoVenue.paths);
    let raf = 0;
    let last = performance.now();
    let time = 0;
    let scale = 1;
    let offX = 0;
    let offY = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      scale = Math.min(w / demoVenue.width, h / demoVenue.height);
      offX = (w - demoVenue.width * scale) / 2;
      offY = (h - demoVenue.height * scale) / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    resize();

    const toVenue = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - offX) / scale,
        y: (clientY - rect.top - offY) / scale,
      };
    };

    const onClick = (e: MouseEvent) => {
      const zone = hitTestZone(demoVenue.zones, toVenue(e.clientX, e.clientY));
      if (zone) frameRef.current.onSelectZone?.(zone.id);
    };
    const onMove = (e: MouseEvent) => {
      const zone = hitTestZone(demoVenue.zones, toVenue(e.clientX, e.clientY));
      canvas.style.cursor = zone ? "pointer" : "default";
    };
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousemove", onMove);

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const f = frameRef.current;
      const byId = new Map(f.zones.map((z) => [z.id, z]));
      const occ = (id: string) => byId.get(id)?.occupancyPercent ?? 0;
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? 0;
      const h = parent?.clientHeight ?? 0;

      ctx.save();
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0f131a";
      ctx.fillRect(0, 0, w, h);
      ctx.translate(offX, offY);
      ctx.scale(scale, scale);

      drawGrid(ctx);
      drawBowl(ctx, time);
      drawSeating(ctx, byId, f.selectedZoneId);
      drawFlowPaths(ctx, time, f.interventionApplied);
      drawHeatmap(ctx, byId);
      drawRectZones(ctx, byId, f.selectedZoneId);

      const specs = buildFlowSpecs(occ, f.interventionApplied);
      field.step(dt, specs);
      field.draw(ctx, specs);

      if (f.predictedZoneId && !f.interventionApplied) {
        drawPredictedHotspot(
          ctx,
          f.predictedZoneId,
          time,
          f.predictedPercent ?? 0,
          f.etaLabel ?? "",
        );
      }
      drawSelection(ctx, f.selectedZoneId, time);
      ctx.restore();

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={props.className}
      role="img"
      aria-label="Digital twin of the venue showing live crowd flow, density and predicted bottlenecks"
    />
  );
}

/* ---------------------------------- draw --------------------------------- */

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= demoVenue.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, demoVenue.height);
    ctx.stroke();
  }
  for (let y = 0; y <= demoVenue.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(demoVenue.width, y);
    ctx.stroke();
  }
}

function drawBowl(ctx: CanvasRenderingContext2D, time: number) {
  const { cx, cy, rx, ry, pitchScale } = demoVenue.bowl;

  ctx.strokeStyle = rgba(PALETTE.info, 0.16);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 26, ry + 26, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#151b23";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.structureLine;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // pitch
  ctx.fillStyle = PALETTE.turf;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * pitchScale, ry * pitchScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(PALETTE.safe, 0.28);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = rgba(PALETTE.safe, 0.16);
  ctx.strokeRect(cx - 26, cy - 62, 52, 124);

  // sweeping scan line — signals a live computational model
  const sweep = (time * 0.35) % (Math.PI * 2);
  const grad = ctx.createLinearGradient(
    cx,
    cy,
    cx + Math.cos(sweep) * rx,
    cy + Math.sin(sweep) * ry,
  );
  grad.addColorStop(0, rgba(PALETTE.info, 0));
  grad.addColorStop(1, rgba(PALETTE.info, 0.1));
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweep) * rx, cy + Math.sin(sweep) * ry);
  ctx.stroke();
}

function drawSeating(
  ctx: CanvasRenderingContext2D,
  byId: Map<string, Zone>,
  selectedId: string | null,
) {
  for (const def of demoVenue.zones) {
    if (def.geometry.shape !== "wedge") continue;
    const zone = byId.get(def.id);
    const pct = zone?.occupancyPercent ?? 0;
    traceWedge(ctx, def.geometry);
    ctx.fillStyle = rgba(densityColor(pct), 0.1 + pct * 0.13);
    ctx.fill();
    ctx.strokeStyle =
      selectedId === def.id ? rgba(PALETTE.info, 0.85) : rgba(PALETTE.structureLine, 0.9);
    ctx.lineWidth = selectedId === def.id ? 2 : 1;
    ctx.stroke();

    // seating rows
    const g = def.geometry;
    ctx.strokeStyle = rgba(PALETTE.structureLine, 0.55);
    ctx.lineWidth = 0.6;
    const steps = 7;
    for (let i = 1; i < steps; i++) {
      const a = g.startAngle + ((g.endAngle - g.startAngle) * i) / steps;
      ctx.beginPath();
      ctx.moveTo(
        g.cx + Math.cos(a) * g.rx * g.innerScale,
        g.cy + Math.sin(a) * g.ry * g.innerScale,
      );
      ctx.lineTo(g.cx + Math.cos(a) * g.rx, g.cy + Math.sin(a) * g.ry);
      ctx.stroke();
    }

    ctx.fillStyle = rgba(PALETTE.text, 0.55);
    ctx.font = "600 11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(def.shortName, def.center.x, def.center.y);
  }
}

function drawFlowPaths(
  ctx: CanvasRenderingContext2D,
  time: number,
  interventionApplied: boolean,
) {
  for (const path of demoVenue.paths) {
    const highlighted =
      interventionApplied && (path.id === "path-exit-d" || path.id === "path-corridor-d");
    ctx.save();
    ctx.setLineDash([10, 12]);
    ctx.lineDashOffset = -time * 30;
    ctx.strokeStyle = highlighted ? rgba(PALETTE.safe, 0.5) : rgba(PALETTE.info, 0.22);
    ctx.lineWidth = highlighted ? 2.4 : 1.4;
    tracePath(ctx, path);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHeatmap(ctx: CanvasRenderingContext2D, byId: Map<string, Zone>) {
  ctx.save();
  for (const def of demoVenue.zones) {
    if (def.kind === "SEATING") continue;
    const zone = byId.get(def.id);
    if (!zone) continue;
    const intensity = Math.max(0, Math.min(1, (zone.occupancyPercent - 0.2) / 0.8));
    if (intensity <= 0.02) continue;
    const color = densityColor(zone.occupancyPercent);
    const r = def.heatRadius * (0.7 + intensity * 0.5);
    const grad = ctx.createRadialGradient(
      def.center.x,
      def.center.y,
      4,
      def.center.x,
      def.center.y,
      r,
    );
    grad.addColorStop(0, rgba(color, 0.05 + intensity * 0.4));
    grad.addColorStop(0.55, rgba(color, 0.04 + intensity * 0.16));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(def.center.x, def.center.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRectZones(
  ctx: CanvasRenderingContext2D,
  byId: Map<string, Zone>,
  selectedId: string | null,
) {
  for (const def of demoVenue.zones) {
    const g = def.geometry;
    if (g.shape !== "rect") continue;
    const zone = byId.get(def.id);
    const pct = zone?.occupancyPercent ?? 0;
    const color = densityColor(pct);
    const selected = selectedId === def.id;

    ctx.fillStyle = rgba(color, 0.1 + pct * 0.22);
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = selected ? PALETTE.info : rgba(color, 0.75);
    ctx.lineWidth = selected ? 2.2 : 1.2;
    ctx.strokeRect(g.x, g.y, g.w, g.h);

    // hatch for gates / exits so meaning is not carried by colour alone
    if (def.kind === "GATE" || def.kind === "EXIT") {
      ctx.save();
      ctx.beginPath();
      ctx.rect(g.x, g.y, g.w, g.h);
      ctx.clip();
      ctx.strokeStyle = rgba(PALETTE.text, 0.12);
      ctx.lineWidth = 1;
      for (let i = -g.h; i < g.w; i += 9) {
        ctx.beginPath();
        ctx.moveTo(g.x + i, g.y + g.h);
        ctx.lineTo(g.x + i + g.h, g.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.fillStyle = rgba(PALETTE.text, 0.9);
    ctx.font = "600 10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(def.shortName, g.x + g.w / 2, g.y - 7);
    ctx.fillStyle = rgba(color, 0.95);
    ctx.font = "700 11px ui-monospace, monospace";
    ctx.fillText(`${Math.round(pct * 100)}%`, g.x + g.w / 2, g.y + g.h / 2 + 4);
  }
}

function drawPredictedHotspot(
  ctx: CanvasRenderingContext2D,
  zoneId: string,
  time: number,
  predicted: number,
  eta: string,
) {
  const def = demoVenue.zones.find((z) => z.id === zoneId);
  if (!def) return;
  const pulse = (Math.sin(time * 2.1) + 1) / 2;
  const r = 74 + pulse * 16;

  ctx.save();
  ctx.setLineDash([7, 7]);
  ctx.lineDashOffset = -time * 22;
  ctx.strokeStyle = rgba(PALETTE.critical, 0.55 + pulse * 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(def.center.x, def.center.y, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = rgba(PALETTE.critical, 0.2);
  ctx.beginPath();
  ctx.ellipse(def.center.x, def.center.y, r + 16, (r + 16) * 0.62, 0, 0, Math.PI * 2);
  ctx.stroke();

  const label = `PREDICTED ${Math.round(predicted * 100)}%`;
  ctx.font = "700 10px ui-monospace, monospace";
  const tw = ctx.measureText(label).width;
  const bx = def.center.x - tw / 2 - 8;
  const by = def.center.y - r * 0.62 - 30;
  ctx.fillStyle = rgba(PALETTE.critical, 0.16);
  ctx.strokeStyle = rgba(PALETTE.critical, 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(bx, by, tw + 16, 19);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.critical;
  ctx.textAlign = "center";
  ctx.fillText(label, def.center.x, by + 13);
  if (eta) {
    ctx.fillStyle = rgba(PALETTE.text, 0.8);
    ctx.font = "600 9px ui-monospace, monospace";
    ctx.fillText(`IN ${eta}`, def.center.x, by + 32);
  }
  ctx.restore();
}

function drawSelection(
  ctx: CanvasRenderingContext2D,
  selectedId: string | null,
  time: number,
) {
  if (!selectedId) return;
  const def = demoVenue.zones.find((z) => z.id === selectedId);
  if (!def) return;
  const pulse = (Math.sin(time * 3) + 1) / 2;
  ctx.save();
  ctx.strokeStyle = rgba(PALETTE.info, 0.35 + pulse * 0.35);
  ctx.lineWidth = 1;
  const size = 16;
  const cx = def.center.x;
  const cy = def.center.y;
  const d = 46;
  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const;
  for (const [sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * d, cy + sy * d - sy * size);
    ctx.lineTo(cx + sx * d, cy + sy * d);
    ctx.lineTo(cx + sx * d - sx * size, cy + sy * d);
    ctx.stroke();
  }
  ctx.restore();
}

function buildFlowSpecs(
  occ: (id: string) => number,
  interventionApplied: boolean,
): Record<string, FlowSpec> {
  const corridorC = occ("corridor-c");
  const rerouteFactor = interventionApplied ? 0.5 : 1;
  return {
    "path-gate-a-in": {
      count: Math.round(14 * occ("gate-a")),
      congestion: occ("gate-a"),
      color: densityColor(occ("gate-a")),
    },
    "path-exit-corridor-c": {
      count: Math.round(80 * corridorC * rerouteFactor),
      congestion: corridorC,
      color: densityColor(corridorC),
    },
    "path-exit-d": {
      count: Math.round(90 * occ("exit-d")),
      congestion: occ("exit-d"),
      color: densityColor(occ("exit-d")),
    },
    "path-exit-e": {
      count: Math.round(60 * occ("exit-e")),
      congestion: occ("exit-e"),
      color: densityColor(occ("exit-e")),
    },
    "path-corridor-d": {
      count: Math.round(55 * occ("corridor-d")),
      congestion: occ("corridor-d"),
      color: densityColor(occ("corridor-d")),
    },
    "path-food-7": {
      count: Math.round(24 * occ("food-7")),
      congestion: occ("food-7"),
      color: densityColor(occ("food-7")),
    },
  };
}
