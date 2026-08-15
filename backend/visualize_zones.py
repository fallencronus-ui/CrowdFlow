import json
import cv2
import pandas as pd
import numpy as np


# ==========================================
# FILES
# ==========================================

VIDEO_PATH = "videos/crowd.mp4"

TRACKING_PATH = "videos/zone_tracking.csv"

CONFIG_PATH = "backend/zone_polygons.json"

OUTPUT_PATH = "videos/zone_visualization.mp4"


# ==========================================
# COORDINATE SYSTEM
# ==========================================

# The zones and tracking data were created
# at this resolution because tracker.py
# processes video at MAX_WIDTH = 1920.

COORD_WIDTH = 1920
COORD_HEIGHT = 1080


# ==========================================
# ZONE COLORS
# ==========================================

ZONE_COLORS = {

    "Left Walkway":
        (0, 255, 0),

    "Main Walkway":
        (255, 180, 0),

    "Right Walkway":
        (0, 0, 255)
}


# ==========================================
# ZONE NAME MAPPING
# ==========================================

ZONE_NAME_MAP = {

    "Zone 1":
        "Left Walkway",

    "Zone 2":
        "Main Walkway",

    "Zone 3":
        "Right Walkway"
}


# ==========================================
# LOAD ZONE POLYGONS
# ==========================================

print("Loading zone polygons...")

with open(
    CONFIG_PATH,
    "r"
) as file:

    config = json.load(file)


zones = config["zones"]


print(
    f"Zones loaded: {len(zones)}"
)


# ==========================================
# LOAD TRACKING DATA
# ==========================================

print("Loading zone tracking data...")

df = pd.read_csv(
    TRACKING_PATH
)


print(
    f"Tracking records: {len(df)}"
)


# ==========================================
# RENAME ZONES
# ==========================================

df["zone_name"] = (

    df["zone"]

    .map(ZONE_NAME_MAP)

    .fillna(df["zone"])
)


# ==========================================
# OPEN VIDEO
# ==========================================

print("Opening video...")

cap = cv2.VideoCapture(
    VIDEO_PATH
)


if not cap.isOpened():

    raise RuntimeError(
        f"Could not open video: {VIDEO_PATH}"
    )


# ==========================================
# VIDEO INFORMATION
# ==========================================

fps = cap.get(
    cv2.CAP_PROP_FPS
)


video_width = int(
    cap.get(
        cv2.CAP_PROP_FRAME_WIDTH
    )
)


video_height = int(
    cap.get(
        cv2.CAP_PROP_FRAME_HEIGHT
    )
)


total_frames = int(
    cap.get(
        cv2.CAP_PROP_FRAME_COUNT
    )
)


print(
    f"Video resolution: "
    f"{video_width} x {video_height}"
)


print(
    f"FPS: {fps:.2f}"
)


print(
    f"Total frames: {total_frames}"
)


# ==========================================
# CALCULATE SCALE
# ==========================================

scale_x = (
    video_width
    /
    COORD_WIDTH
)


scale_y = (
    video_height
    /
    COORD_HEIGHT
)


print()

print(
    f"Coordinate scale: "
    f"{scale_x:.2f}x horizontally, "
    f"{scale_y:.2f}x vertically"
)


# ==========================================
# PREPARE ZONE POLYGONS
# ==========================================

zone_polygons = {}


for zone_name, zone in zones.items():

    original_polygon = np.array(
        zone["polygon"],
        dtype=np.float32
    )


    # Scale polygon from
    # 1920x1080 → 3840x2160

    scaled_polygon = (
        original_polygon
        *
        np.array(
            [
                scale_x,
                scale_y
            ]
        )
    )


    scaled_polygon = (
        scaled_polygon
        .astype(np.int32)
    )


    zone_polygons[
        zone_name
    ] = scaled_polygon


# ==========================================
# CREATE OUTPUT VIDEO
# ==========================================

fourcc = cv2.VideoWriter_fourcc(
    *"mp4v"
)


out = cv2.VideoWriter(
    OUTPUT_PATH,
    fourcc,
    fps,
    (
        video_width,
        video_height
    )
)


if not out.isOpened():

    raise RuntimeError(
        "Could not create output video."
    )


# ==========================================
# GROUP TRACKING DATA BY FRAME
# ==========================================

tracking_by_frame = {

    frame:
        group

    for frame, group
    in df.groupby("frame")
}


# ==========================================
# PROCESS VIDEO
# ==========================================

frame_number = 0


while True:

    ret, frame = cap.read()


    if not ret:

        break


    frame_number += 1


    # ======================================
    # DRAW ZONES
    # ======================================

    for zone_name, polygon in zone_polygons.items():

        color = ZONE_COLORS.get(
            zone_name,
            (255, 255, 255)
        )


        # ----------------------------------
        # Transparent fill
        # ----------------------------------

        overlay = frame.copy()


        cv2.fillPoly(
            overlay,
            [polygon],
            color
        )


        frame = cv2.addWeighted(
            overlay,
            0.12,
            frame,
            0.88,
            0
        )


        # ----------------------------------
        # Boundary
        # ----------------------------------

        cv2.polylines(
            frame,
            [polygon],
            True,
            color,
            6
        )


        # ----------------------------------
        # Label position
        # ----------------------------------

        moments = cv2.moments(
            polygon
        )


        if moments["m00"] != 0:

            label_x = int(
                moments["m10"]
                /
                moments["m00"]
            )

            label_y = int(
                moments["m01"]
                /
                moments["m00"]
            )

        else:

            label_x = int(
                polygon[0][0]
            )

            label_y = int(
                polygon[0][1]
            )


        # ----------------------------------
        # Zone label
        # ----------------------------------

        cv2.putText(
            frame,
            zone_name,
            (
                label_x,
                label_y
            ),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.5,
            color,
            4
        )


    # ======================================
    # GET TRACKING DATA
    # ======================================

    frame_data = tracking_by_frame.get(
        frame_number
    )


    people_count = 0


    if frame_data is not None:

        people_count = len(
            frame_data
        )


        # ==================================
        # DRAW PEOPLE
        # ==================================

        for _, person in frame_data.iterrows():

            person_id = int(
                person["person_id"]
            )


            # --------------------------------
            # TRACKING COORDINATES
            # --------------------------------

            center_x = int(
                person["center_x"]
                *
                scale_x
            )


            center_y = int(
                person["center_y"]
                *
                scale_y
            )


            foot_x = int(
                person["foot_x"]
                *
                scale_x
            )


            foot_y = int(
                person["foot_y"]
                *
                scale_y
            )


            zone_name = person[
                "zone_name"
            ]


            color = ZONE_COLORS.get(
                zone_name,
                (255, 255, 255)
            )


            # =================================
            # FOOT POINT
            # =================================

            cv2.circle(
                frame,
                (
                    foot_x,
                    foot_y
                ),
                12,
                color,
                -1
            )


            # =================================
            # CENTER POINT
            # =================================

            cv2.circle(
                frame,
                (
                    center_x,
                    center_y
                ),
                7,
                color,
                -1
            )


            # =================================
            # PERSON LABEL
            # =================================

            label = (

                f"ID {person_id} | "

                f"{zone_name}"
            )


            label_x = (
                center_x + 15
            )


            label_y = (
                center_y - 15
            )


            # Keep text inside frame

            if label_x > video_width - 500:

                label_x = (
                    center_x - 480
                )


            if label_y < 40:

                label_y = (
                    center_y + 40
                )


            cv2.putText(
                frame,
                label,
                (
                    label_x,
                    label_y
                ),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                color,
                3
            )


    # ======================================
    # PEOPLE COUNT
    # ======================================

    cv2.rectangle(
        frame,
        (30, 30),
        (430, 110),
        (0, 0, 0),
        -1
    )


    cv2.putText(
        frame,
        f"PEOPLE: {people_count}",
        (50, 85),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.3,
        (255, 255, 255),
        4
    )


    # ======================================
    # FRAME NUMBER
    # ======================================

    cv2.putText(
        frame,
        f"Frame: {frame_number}",
        (
            video_width - 300,
            60
        ),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (255, 255, 255),
        3
    )


    # ======================================
    # SAVE FRAME
    # ======================================

    out.write(
        frame
    )


    # ======================================
    # PROGRESS
    # ======================================

    if frame_number % 100 == 0:

        print(
            f"Processed "
            f"{frame_number}/"
            f"{total_frames}"
        )


# ==========================================
# CLEANUP
# ==========================================

cap.release()

out.release()


# ==========================================
# COMPLETE
# ==========================================

print()

print("--------------------------------")

print(
    "ZONE VISUALIZATION COMPLETE"
)

print("--------------------------------")

print(
    f"Output: {OUTPUT_PATH}"
)

print("--------------------------------")