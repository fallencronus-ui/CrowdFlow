export type ZoneKind =
  | "GATE"
  | "EXIT"
  | "CORRIDOR"
  | "CONCESSION"
  | "SEATING"
  | "CONCOURSE";

export interface RectShape {
  shape: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WedgeShape {
  shape: "wedge";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  innerScale: number;
  startAngle: number;
  endAngle: number;
}

export type ZoneShape = RectShape | WedgeShape;

export interface ZoneDefinition {
  id: string;
  name: string;
  shortName: string;
  kind: ZoneKind;
  capacity: number;
  /** square metres */
  area: number;
  geometry: ZoneShape;
  /** anchor point for labels, heatmap blobs and camera focus */
  center: { x: number; y: number };
  heatRadius: number;
}

export interface FlowPath {
  id: string;
  label: string;
  points: Array<{ x: number; y: number }>;
  /** zones this path passes through, used for density attribution */
  zoneIds: string[];
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  width: number;
  height: number;
  bowl: { cx: number; cy: number; rx: number; ry: number; pitchScale: number };
  zones: ZoneDefinition[];
  paths: FlowPath[];
}

export interface VenueEvent {
  id: string;
  name: string;
  venueName: string;
  city: string;
  attendees: number;
  startLabel: string;
  endLabel: string;
  timeline: Array<{ time: string; label: string; atSecond: number }>;
}
