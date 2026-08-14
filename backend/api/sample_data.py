"""OPTIONAL developer utility — writes sample pipeline CSVs into videos/.

This is NOT part of the analysis pipeline and is never imported by the API.
It exists only so the dashboard's BACKEND mode can be exercised end to end
before you have a video to run tracker.py on.

    python backend/api/sample_data.py

Delete videos/ (or re-run the real pipeline) to replace this with real output.
Every file written here has exactly the same columns the real pipeline emits,
so the API and frontend behave identically with real data.
"""

from __future__ import annotations

import csv
import json
import math
import os
import random

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VIDEOS = os.path.join(ROOT, "videos")
CONFIG = os.path.join(ROOT, "backend", "venue_config.json")

FRAMES = list(range(0, 600, 30))


def write(name: str, fieldnames: list[str], rows: list[dict]) -> None:
    os.makedirs(VIDEOS, exist_ok=True)
    path = os.path.join(VIDEOS, name)
    with open(path, "w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {path} ({len(rows)} rows)")


def main() -> None:
    random.seed(7)
    with open(CONFIG) as handle:
        config = json.load(handle)
    zones = config.get("zones", {})
    thresholds = config.get("density_thresholds", {})

    def level(density: float) -> str:
        if density >= thresholds.get("critical", 0.75):
            return "CRITICAL"
        if density >= thresholds.get("high", 0.5):
            return "HIGH"
        if density >= thresholds.get("medium", 0.25):
            return "MEDIUM"
        return "LOW"

    # people count per zone per frame (rising curve + noise)
    counts: dict[str, dict[int, int]] = {}
    for index, (zone, cfg) in enumerate(zones.items()):
        capacity = cfg.get("capacity", 50)
        counts[zone] = {}
        for step, frame in enumerate(FRAMES):
            ramp = 0.25 + 0.6 * (step / max(1, len(FRAMES) - 1))
            wobble = 0.08 * math.sin(step / 2 + index)
            counts[zone][frame] = max(
                0, int(capacity * (ramp + wobble) + random.randint(-2, 2))
            )

    # --- zone_tracking.csv (zone_analysis.py) ---
    tracking = []
    for zone, per_frame in counts.items():
        for frame, people in per_frame.items():
            for track in range(people):
                tracking.append(
                    {
                        "frame": frame,
                        "track_id": f"{zone[-1]}{track:03d}",
                        "x": round(random.uniform(0, 100), 2),
                        "y": round(random.uniform(0, 100), 2),
                        "zone": zone,
                    }
                )
    write("zone_tracking.csv", ["frame", "track_id", "x", "y", "zone"], tracking)

    # --- density_analysis.csv ---
    density_rows = []
    for zone, cfg in zones.items():
        area = cfg.get("area_m2", 100)
        capacity = cfg.get("capacity", 50)
        for frame in FRAMES:
            people = counts[zone][frame]
            density = round(people / area, 4)
            usage = round(100 * people / capacity, 1) if capacity else None
            density_rows.append(
                {
                    "frame": frame,
                    "zone": zone,
                    "people": people,
                    "area_m2": area,
                    "capacity": capacity,
                    "density": density,
                    "capacity_usage": usage,
                    "density_level": level(density),
                    "capacity_status": "OVER CAPACITY"
                    if usage and usage >= 100
                    else "FILLING"
                    if usage and usage >= 70
                    else "OK",
                }
            )
    write(
        "density_analysis.csv",
        [
            "frame",
            "zone",
            "people",
            "area_m2",
            "capacity",
            "density",
            "capacity_usage",
            "density_level",
            "capacity_status",
        ],
        density_rows,
    )

    # --- zone_flow.csv (per-minute entries/exits) ---
    flow_rows = []
    for zone in zones:
        for minute in range(1, 4):
            entries = random.randint(8, 26)
            exits = random.randint(4, 18)
            net = entries - exits
            flow_rows.append(
                {
                    "zone": zone,
                    "minute": minute,
                    "entries_per_minute": entries,
                    "exits_per_minute": exits,
                    "net_flow_per_minute": net,
                    "flow_status": "INFLOW" if net > 0 else "OUTFLOW",
                }
            )
    write(
        "zone_flow.csv",
        [
            "zone",
            "minute",
            "entries_per_minute",
            "exits_per_minute",
            "net_flow_per_minute",
            "flow_status",
        ],
        flow_rows,
    )

    # --- flow_analysis.csv (directional) ---
    write(
        "flow_analysis.csv",
        ["zone", "direction", "count"],
        [
            {"zone": zone, "direction": direction, "count": random.randint(2, 30)}
            for zone in zones
            for direction in ("north", "south", "east", "west")
        ],
    )

    # --- congestion_analysis.csv / zone_congestion.csv ---
    congestion_rows = []
    for zone in zones:
        previous = counts[zone][FRAMES[-2]]
        people = counts[zone][FRAMES[-1]]
        change = people - previous
        congestion_rows.append(
            {
                "zone": zone,
                "frame": FRAMES[-1],
                "people": people,
                "previous_people": previous,
                "density_change": change,
                "growth_rate": round(change / previous, 3) if previous else 0,
                "congestion": "BUILDING" if change > 0 else "EASING",
                "trend": "RISING" if change > 0 else "FALLING",
            }
        )
    columns = [
        "zone",
        "frame",
        "people",
        "previous_people",
        "density_change",
        "growth_rate",
        "congestion",
        "trend",
    ]
    write("congestion_analysis.csv", columns, congestion_rows)
    write("zone_congestion.csv", columns, congestion_rows)

    # --- early_warning.csv ---
    warning_rows = []
    for zone, cfg in zones.items():
        area = cfg.get("area_m2", 100)
        capacity = cfg.get("capacity", 50)
        people = counts[zone][FRAMES[-1]]
        density = round(people / area, 4)
        usage = round(100 * people / capacity, 1) if capacity else 0
        flow = next(r for r in flow_rows if r["zone"] == zone)
        net = flow["net_flow_per_minute"]
        headroom = max(0, capacity - people)
        risk = min(100, round(usage * 0.8 + max(0, net) * 1.5))
        warning_rows.append(
            {
                "zone": zone,
                "people": people,
                "area_m2": area,
                "density_people_m2": density,
                "capacity": capacity,
                "capacity_usage": usage,
                "entries_per_minute": flow["entries_per_minute"],
                "exits_per_minute": flow["exits_per_minute"],
                "net_flow_per_minute": net,
                "minutes_to_capacity": round(headroom / net, 1) if net > 0 else None,
                "risk_score": risk,
                "risk_level": "CRITICAL"
                if risk >= 85
                else "HIGH"
                if risk >= 65
                else "MEDIUM"
                if risk >= 40
                else "LOW",
                "prediction": f"{zone} at {usage}% of capacity",
                "recommendation": "Divert inbound flow and open alternate egress"
                if risk >= 65
                else "Monitor",
            }
        )
    write(
        "early_warning.csv",
        [
            "zone",
            "people",
            "area_m2",
            "density_people_m2",
            "capacity",
            "capacity_usage",
            "entries_per_minute",
            "exits_per_minute",
            "net_flow_per_minute",
            "minutes_to_capacity",
            "risk_score",
            "risk_level",
            "prediction",
            "recommendation",
        ],
        warning_rows,
    )

    # --- crowd_prediction.csv ---
    prediction_rows = []
    for zone, cfg in zones.items():
        capacity = cfg.get("capacity", 50)
        people = counts[zone][FRAMES[-1]]
        trend = next(r for r in flow_rows if r["zone"] == zone)["net_flow_per_minute"]
        headroom = max(0, capacity - people)
        prediction_rows.append(
            {
                "zone": zone,
                "current_people": people,
                "trend_people_per_minute": trend,
                "predicted_people_5_min": max(0, people + trend * 5),
                "predicted_people_10_min": max(0, people + trend * 10),
                "capacity": capacity,
                "minutes_to_capacity": round(headroom / trend, 1) if trend > 0 else None,
                "trend": "RISING" if trend > 0 else "FALLING",
                "prediction": "Capacity breach likely"
                if trend > 0 and headroom / max(trend, 1) < 10
                else "Stable",
            }
        )
    write(
        "crowd_prediction.csv",
        [
            "zone",
            "current_people",
            "trend_people_per_minute",
            "predicted_people_5_min",
            "predicted_people_10_min",
            "capacity",
            "minutes_to_capacity",
            "trend",
            "prediction",
        ],
        prediction_rows,
    )


if __name__ == "__main__":
    main()
