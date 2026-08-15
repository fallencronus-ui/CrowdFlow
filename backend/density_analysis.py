import json
import pandas as pd


# ==========================================
# FILE SETTINGS
# ==========================================

INPUT_PATH = "videos/zone_tracking.csv"

CONFIG_PATH = "backend/venue_config.json"

OUTPUT_PATH = "videos/density_analysis.csv"


# ==========================================
# ZONE NAME MAPPING
# ==========================================

ZONE_NAME_MAP = {
    "Zone 1": "Left Walkway",
    "Zone 2": "Main Walkway",
    "Zone 3": "Right Walkway"
}


# ==========================================
# LOAD DATA
# ==========================================

print("Loading zone tracking data...")

df = pd.read_csv(
    INPUT_PATH
)


# ==========================================
# LOAD VENUE CONFIGURATION
# ==========================================

print("Loading venue configuration...")

with open(
    CONFIG_PATH,
    "r"
) as file:

    config = json.load(file)


venue_name = config["venue_name"]

zones_config = config["zones"]

thresholds = config["density_thresholds"]


print(
    f"Venue: {venue_name}"
)

print(
    f"Configured zones: "
    f"{len(zones_config)}"
)


# ==========================================
# KEEP ORIGINAL ZONE IDs
# ==========================================

# We keep Zone 1/2/3 internally so that
# existing polygon/tracking data remains
# compatible.


# ==========================================
# IGNORE PEOPLE OUTSIDE
# ==========================================

df = df[
    df["zone"] != "Outside"
].copy()


# ==========================================
# COUNT PEOPLE PER FRAME + ZONE
# ==========================================

zone_counts = (
    df.groupby(
        [
            "frame",
            "zone"
        ]
    )
    .size()
    .reset_index(
        name="people"
    )
)


# ==========================================
# MAP ZONE → DISPLAY NAME
# ==========================================

zone_counts["zone_name"] = (
    zone_counts["zone"]
    .map(ZONE_NAME_MAP)
)


# ==========================================
# ADD PHYSICAL AREA
# ==========================================

zone_counts["area_m2"] = (
    zone_counts["zone_name"]
    .map(
        lambda zone:
        zones_config
        .get(
            zone,
            {}
        )
        .get(
            "area_m2",
            0
        )
    )
)


# ==========================================
# ADD CAPACITY
# ==========================================

zone_counts["capacity"] = (
    zone_counts["zone_name"]
    .map(
        lambda zone:
        zones_config
        .get(
            zone,
            {}
        )
        .get(
            "capacity",
            0
        )
    )
)


# ==========================================
# CALCULATE DENSITY
# ==========================================

zone_counts["density"] = (
    zone_counts["people"]
    /
    zone_counts["area_m2"]
    .replace(
        0,
        pd.NA
    )
)


# ==========================================
# CALCULATE CAPACITY USAGE
# ==========================================

zone_counts["capacity_usage"] = (
    zone_counts["people"]
    /
    zone_counts["capacity"]
    .replace(
        0,
        pd.NA
    )
)


# ==========================================
# CLASSIFY DENSITY
# ==========================================

def classify_density(value):

    if pd.isna(value):

        return "UNKNOWN"


    if value >= thresholds["critical"]:

        return "CRITICAL"


    if value >= thresholds["high"]:

        return "HIGH"


    if value >= thresholds["medium"]:

        return "MEDIUM"


    return "LOW"


zone_counts["density_level"] = (
    zone_counts["density"]
    .apply(
        classify_density
    )
)


# ==========================================
# CLASSIFY CAPACITY
# ==========================================

def classify_capacity(value):

    if pd.isna(value):

        return "UNKNOWN"


    if value >= 1.0:

        return "OVER CAPACITY"


    if value >= 0.80:

        return "NEAR CAPACITY"


    if value >= 0.60:

        return "MODERATE"


    return "NORMAL"


zone_counts["capacity_status"] = (
    zone_counts["capacity_usage"]
    .apply(
        classify_capacity
    )
)


# ==========================================
# SAVE
# ==========================================

zone_counts.to_csv(
    OUTPUT_PATH,
    index=False
)


# ==========================================
# CURRENT STATUS
# ==========================================

latest_frame = zone_counts[
    "frame"
].max()


latest = zone_counts[
    zone_counts["frame"]
    == latest_frame
]


print()
print("--------------------------------")
print("CURRENT DENSITY")
print("--------------------------------")


for _, row in latest.iterrows():

    density = row["density"]

    capacity_usage = (
        row["capacity_usage"]
    )


    if pd.isna(density):

        density_text = "N/A"

    else:

        density_text = (
            f"{density:.3f} people/m²"
        )


    if pd.isna(capacity_usage):

        capacity_text = "N/A"

    else:

        capacity_text = (
            f"{capacity_usage * 100:.1f}%"
        )


    print(
        f"{row['zone_name']}: "
        f"{int(row['people'])} people "
        f"| Density: {density_text} "
        f"| Capacity: {capacity_text} "
        f"| {row['density_level']} "
        f"| {row['capacity_status']}"
    )


# ==========================================
# COMPLETE
# ==========================================

print()
print("--------------------------------")
print("DENSITY ANALYSIS COMPLETE")
print("--------------------------------")

print(
    f"Output: {OUTPUT_PATH}"
)

print("--------------------------------")