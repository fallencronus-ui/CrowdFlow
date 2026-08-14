"""API routes exposing the existing CrowdFlow pipeline outputs.

Every endpoint reads an artifact that the original Python scripts already
produce. No new crowd-analysis logic lives here.
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from .csv_utils import (
    PipelineNotRun,
    exists,
    latest_per_zone,
    load_venue_config,
    read_csv,
)

router = APIRouter(prefix="/api")


def _pipeline_error(exc: PipelineNotRun) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={
            "error": "PIPELINE_NOT_RUN",
            "missing": exc.filename,
            "message": str(exc),
        },
    )


# ------------------------------------------------------------------
# HEALTH
# ------------------------------------------------------------------
@router.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "artifacts": {
            "zone_tracking.csv": exists("zone_tracking.csv"),
            "density_analysis.csv": exists("density_analysis.csv"),
            "zone_flow.csv": exists("zone_flow.csv"),
            "flow_analysis.csv": exists("flow_analysis.csv"),
            "congestion_analysis.csv": exists("congestion_analysis.csv"),
            "zone_congestion.csv": exists("zone_congestion.csv"),
            "early_warning.csv": exists("early_warning.csv"),
            "crowd_prediction.csv": exists("crowd_prediction.csv"),
        },
    }


# ------------------------------------------------------------------
# VENUE  (backend/venue_config.json)
# ------------------------------------------------------------------
@router.get("/venue")
def venue() -> Dict[str, Any]:
    config = load_venue_config()
    return {
        "venue_name": config.get("venue_name"),
        "zones": config.get("zones", {}),
        "density_thresholds": config.get("density_thresholds"),
    }


# ------------------------------------------------------------------
# CURRENT  (videos/zone_tracking.csv from zone_analysis.py)
# ------------------------------------------------------------------
@router.get("/crowd/current")
def crowd_current() -> Dict[str, Any]:
    try:
        rows = read_csv(
            "zone_tracking.csv",
            stage="python backend/tracker.py -> python backend/zone_analysis.py",
        )
    except PipelineNotRun as exc:
        raise _pipeline_error(exc)

    rows = [r for r in rows if r.get("zone") not in (None, "Outside")]
    if not rows:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "NO_DATA",
                "message": "videos/zone_tracking.csv contains no in-zone observations.",
            },
        )

    latest_frame = max(int(r["frame"]) for r in rows if r.get("frame") is not None)
    config_zones = load_venue_config().get("zones", {})

    counts: Dict[str, int] = {}
    for row in rows:
        if row.get("frame") == latest_frame:
            counts[str(row["zone"])] = counts.get(str(row["zone"]), 0) + 1

    zones: List[Dict[str, Any]] = []
    for name, cfg in config_zones.items():
        people = counts.get(name, 0)
        capacity = cfg.get("capacity") or 0
        zones.append(
            {
                "name": name,
                "people": people,
                "capacity": capacity,
                "area_m2": cfg.get("area_m2"),
                "occupancyPercent": (people / capacity * 100) if capacity else None,
            }
        )
    # zones present in tracking but not in venue_config
    for name, people in counts.items():
        if name not in config_zones:
            zones.append(
                {
                    "name": name,
                    "people": people,
                    "capacity": None,
                    "area_m2": None,
                    "occupancyPercent": None,
                }
            )

    return {"latestFrame": latest_frame, "zones": zones}


# ------------------------------------------------------------------
# DENSITY  (videos/density_analysis.csv from density_analysis.py)
# ------------------------------------------------------------------
@router.get("/crowd/density")
def crowd_density() -> Dict[str, Any]:
    try:
        rows = read_csv(
            "density_analysis.csv", stage="python backend/density_analysis.py"
        )
    except PipelineNotRun as exc:
        raise _pipeline_error(exc)

    latest = latest_per_zone(rows, order_key="frame")
    latest_frame = max((r.get("frame") or 0) for r in latest) if latest else None
    return {"latestFrame": latest_frame, "zones": latest}


# ------------------------------------------------------------------
# FLOW  (videos/zone_flow.csv from zone_flow.py, flow_analysis.py extra)
# ------------------------------------------------------------------
@router.get("/crowd/flow")
def crowd_flow() -> Dict[str, Any]:
    try:
        rows = read_csv("zone_flow.csv", stage="python backend/zone_flow.py")
    except PipelineNotRun as exc:
        raise _pipeline_error(exc)

    latest = latest_per_zone(rows, order_key="minute")

    directions: Dict[str, Dict[str, Any]] = {}
    try:
        for row in read_csv("flow_analysis.csv", stage="python backend/flow_analysis.py"):
            zone = row.get("zone")
            if zone is not None:
                directions[str(zone)] = {
                    k: v for k, v in row.items() if k != "zone"
                }
    except PipelineNotRun:
        directions = {}

    zones = []
    for row in latest:
        zone = str(row.get("zone"))
        zones.append(
            {
                "zone": zone,
                "minute": row.get("minute"),
                "entriesPerMinute": row.get("entries_per_minute"),
                "exitsPerMinute": row.get("exits_per_minute"),
                "netFlowPerMinute": row.get("net_flow_per_minute"),
                "flowStatus": row.get("flow_status"),
                # only present when flow_analysis.py has been run
                "directions": directions.get(zone),
            }
        )
    return {"zones": zones}


# ------------------------------------------------------------------
# CONGESTION  (videos/congestion_analysis.csv, videos/zone_congestion.csv)
# ------------------------------------------------------------------
@router.get("/crowd/congestion")
def crowd_congestion() -> Dict[str, Any]:
    try:
        rows = read_csv(
            "congestion_analysis.csv", stage="python backend/congestion.py"
        )
        source = "videos/congestion_analysis.csv"
    except PipelineNotRun as primary:
        try:
            rows = read_csv(
                "zone_congestion.csv", stage="python backend/zone_congestion.py"
            )
            source = "videos/zone_congestion.csv"
        except PipelineNotRun:
            raise _pipeline_error(primary)

    latest = latest_per_zone(rows, order_key="frame")
    return {"source": source, "zones": latest}


# ------------------------------------------------------------------
# EARLY WARNING  (videos/early_warning.csv from early_warning.py)
# ------------------------------------------------------------------
@router.get("/warnings")
def warnings() -> Dict[str, Any]:
    try:
        rows = read_csv("early_warning.csv", stage="python backend/early_warning.py")
    except PipelineNotRun as exc:
        raise _pipeline_error(exc)
    return {"zones": rows}


# ------------------------------------------------------------------
# PREDICTIONS  (videos/crowd_prediction.csv from crowd_prediction.py)
# ------------------------------------------------------------------
@router.get("/predictions")
def predictions() -> Dict[str, Any]:
    try:
        rows = read_csv(
            "crowd_prediction.csv", stage="python backend/crowd_prediction.py"
        )
    except PipelineNotRun as exc:
        raise _pipeline_error(exc)
    return {"zones": rows}


# ------------------------------------------------------------------
# TIMELINE  (time-series from density_analysis.csv + zone_flow.csv)
# ------------------------------------------------------------------
@router.get("/crowd/timeline")
def timeline(limit: int = 240) -> Dict[str, Any]:
    try:
        density_rows = read_csv(
            "density_analysis.csv", stage="python backend/density_analysis.py"
        )
    except PipelineNotRun as exc:
        raise _pipeline_error(exc)

    frames = sorted({r.get("frame") for r in density_rows if r.get("frame") is not None})
    frames = frames[-limit:]
    frame_set = set(frames)

    points = [
        {
            "frame": r.get("frame"),
            "zone": r.get("zone"),
            "people": r.get("people"),
            "density": r.get("density"),
            "capacity": r.get("capacity"),
            "capacityUsage": r.get("capacity_usage"),
            "densityLevel": r.get("density_level"),
            "capacityStatus": r.get("capacity_status"),
        }
        for r in density_rows
        if r.get("frame") in frame_set
    ]

    flow_points: List[Dict[str, Any]] = []
    try:
        for r in read_csv("zone_flow.csv", stage="python backend/zone_flow.py"):
            flow_points.append(
                {
                    "minute": r.get("minute"),
                    "zone": r.get("zone"),
                    "entriesPerMinute": r.get("entries_per_minute"),
                    "exitsPerMinute": r.get("exits_per_minute"),
                    "netFlowPerMinute": r.get("net_flow_per_minute"),
                    "flowStatus": r.get("flow_status"),
                }
            )
    except PipelineNotRun:
        flow_points = []

    return {"density": points, "flow": flow_points}
