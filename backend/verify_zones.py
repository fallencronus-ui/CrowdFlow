import json
import cv2
import pandas as pd
import numpy as np


# ==========================================
# FILES
# ==========================================

VIDEO_PATH = "videos/crowd.mp4"
TRACKS_PATH = "videos/zone_tracking.csv"
ZONES_PATH = "videos/zones.json"

OUTPUT_PATH = "videos/zone_verification.mp4"


# ==========================================
# LOAD TRACKING DATA
# ==========================================

print("Loading zone tracking data...")

df = pd.read_csv(TRACKS_PATH)

print(f"Records: {len(df)}")


# ==========================================
# LOAD ZONES
# ==========================================

with open(ZONES_PATH, "r") as file:
    zone_data = json.load(file)

zones = zone_data["zones"]

print(f"Zones: {len(zones)}")


# ==========================================
# OPEN VIDEO
# ==========================================

cap = cv2.VideoCapture(VIDEO_PATH)

if not cap.isOpened():
    raise RuntimeError(
        f"Could not open video: {VIDEO_PATH}"
    )


fps = cap.get(cv2.CAP_PROP_FPS)

original_width = int(
    cap.get(cv2.CAP_PROP_FRAME_WIDTH)
)

original_height = int(
    cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
)

total_frames = int(
    cap.get(cv2.CAP_PROP_FRAME_COUNT)
)


# ==========================================
# SAME RESOLUTION AS TRACKER
# ==========================================

MAX_WIDTH = 1920

if original_width > MAX_WIDTH:

    scale = MAX_WIDTH / original_width

    width = MAX_WIDTH
    height = int(original_height * scale)

else:

    width = original_width
    height = original_height


print(
    f"Resolution: {width} x {height}"
)

print(
    f"Total frames: {total_frames}"
)


# ==========================================
# OUTPUT VIDEO
# ==========================================

fourcc = cv2.VideoWriter_fourcc(
    *"mp4v"
)

out = cv2.VideoWriter(
    OUTPUT_PATH,
    fourcc,
    fps,
    (width, height)
)


# ==========================================
# PREPARE POLYGONS
# ==========================================

zone_polygons = {}

for zone in zones:

    zone_name = zone["name"]

    polygon = np.array(
        zone["polygon"],
        dtype=np.int32
    )

    zone_polygons[zone_name] = polygon


# ==========================================
# PROCESS VIDEO
# ==========================================

frame_number = 0


while True:

    ret, frame = cap.read()

    if not ret:
        break

    frame_number += 1


    # --------------------------------------
    # Resize
    # --------------------------------------

    if (
        frame.shape[1] != width
        or frame.shape[0] != height
    ):

        frame = cv2.resize(
            frame,
            (width, height),
            interpolation=cv2.INTER_AREA
        )


    # --------------------------------------
    # Get tracking data for this frame
    # --------------------------------------

    frame_data = df[
        df["frame"] == frame_number
    ]


    # ======================================
    # DRAW ZONES
    # ======================================

    for zone_name, polygon in zone_polygons.items():

        cv2.polylines(
            frame,
            [polygon],
            True,
            (255, 255, 0),
            4
        )


        # Find approximate label position

        center = polygon.mean(
            axis=0
        ).astype(int)

        cv2.putText(
            frame,
            zone_name,
            (
                int(center[0]),
                int(center[1])
            ),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (255, 255, 0),
            3
        )


    # ======================================
    # DRAW TRACKED PEOPLE
    # ======================================

    for _, person in frame_data.iterrows():

        x = int(person["center_x"])
        y = int(person["center_y"])

        person_id = int(
            person["person_id"]
        )

        zone = person["zone"]


        # ----------------------------------
        # Color based on zone
        # ----------------------------------

        if zone == "Outside":

            color = (
                0,
                0,
                255
            )

        else:

            color = (
                0,
                255,
                0
            )


        # ----------------------------------
        # Person point
        # ----------------------------------

        cv2.circle(
            frame,
            (x, y),
            8,
            color,
            -1
        )


        # ----------------------------------
        # Person ID
        # ----------------------------------

        text = (
            f"ID {person_id} | {zone}"
        )


        cv2.putText(
            frame,
            text,
            (
                x + 10,
                y
            ),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            color,
            2
        )


    # ======================================
    # FRAME INFORMATION
    # ======================================

    people_inside = len(
        frame_data[
            frame_data["zone"] != "Outside"
        ]
    )

    people_outside = len(
        frame_data[
            frame_data["zone"] == "Outside"
        ]
    )


    cv2.putText(
        frame,
        "CrowdFlow Zone Verification",
        (30, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        (255, 255, 255),
        3
    )


    cv2.putText(
        frame,
        f"Inside zones: {people_inside}",
        (30, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.75,
        (0, 255, 0),
        2
    )


    cv2.putText(
        frame,
        f"Outside zones: {people_outside}",
        (30, 115),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.75,
        (0, 0, 255),
        2
    )


    # ======================================
    # SAVE
    # ======================================

    out.write(frame)


    # ======================================
    # PROGRESS
    # ======================================

    if frame_number % 100 == 0:

        print(
            f"Processed "
            f"{frame_number}/{total_frames}"
        )


# ==========================================
# CLEANUP
# ==========================================

cap.release()
out.release()


print()
print("--------------------------------")
print("ZONE VERIFICATION COMPLETE")
print("--------------------------------")

print(
    f"Output: {OUTPUT_PATH}"
)

print("--------------------------------")