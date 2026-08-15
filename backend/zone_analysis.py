import json
import cv2
import pandas as pd
import numpy as np


# ==========================================
# FILES
# ==========================================

TRACKS_PATH = "videos/tracks.csv"
ZONES_PATH = "videos/zones.json"
OUTPUT_PATH = "videos/zone_tracking.csv"


# ==========================================
# LOAD TRACKING DATA
# ==========================================

print("Loading tracking data...")

df = pd.read_csv(TRACKS_PATH)

print(
    f"Tracking records: {len(df)}"
)

print(
    f"Unique people: "
    f"{df['person_id'].nunique()}"
)


# ==========================================
# LOAD ZONES
# ==========================================

print("Loading zones...")

with open(ZONES_PATH, "r") as file:
    zone_data = json.load(file)


zones = zone_data["zones"]


print(
    f"Zones loaded: {len(zones)}"
)


# ==========================================
# CONVERT POLYGONS
# ==========================================

zone_polygons = {}

for zone in zones:

    zone_name = zone["name"]

    polygon = np.array(
        zone["polygon"],
        dtype=np.int32
    )

    zone_polygons[
        zone_name
    ] = polygon


# ==========================================
# FIND ZONE FOR EACH PERSON
# ==========================================

def find_zone(x, y):

    point = (
        float(x),
        float(y)
    )

    for zone_name, polygon in zone_polygons.items():

        inside = cv2.pointPolygonTest(
            polygon,
            point,
            False
        )

        if inside >= 0:
            return zone_name

    return "Outside"


print()
print("Assigning people to zones...")


df["zone"] = df.apply(
    lambda row: find_zone(
        row["foot_x"],
        row["foot_y"]
    ),
    axis=1
)


# ==========================================
# SAVE
# ==========================================

df.to_csv(
    OUTPUT_PATH,
    index=False
)


# ==========================================
# CURRENT FRAME ANALYSIS
# ==========================================

latest_frame = df["frame"].max()

latest = df[
    df["frame"] == latest_frame
]


print()
print("--------------------------------")
print("CURRENT ZONE STATUS")
print("--------------------------------")


zone_counts = (
    latest["zone"]
    .value_counts()
)


for zone, count in zone_counts.items():

    print(
        f"{zone}: {count} people"
    )


# ==========================================
# OUTSIDE COUNT
# ==========================================

outside_count = (
    latest["zone"] == "Outside"
).sum()


print()
print(
    f"Outside defined zones: "
    f"{outside_count}"
)


# ==========================================
# COMPLETE
# ==========================================

print()
print("--------------------------------")
print("ZONE ANALYSIS COMPLETE")
print("--------------------------------")

print(
    f"Output: {OUTPUT_PATH}"
)

print("--------------------------------")