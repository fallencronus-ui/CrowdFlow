import cv2
import pandas as pd
import numpy as np


# ==========================================
# 1. FILE SETTINGS
# ==========================================

CSV_PATH = "videos/crowd_analysis.csv"
VIDEO_PATH = "videos/crowd.mp4"
OUTPUT_PATH = "videos/crowd_heatmap.mp4"


# ==========================================
# 2. LOAD ANALYSIS DATA
# ==========================================

print("Loading crowd analysis data...")

df = pd.read_csv(CSV_PATH)

print(f"Records: {len(df)}")
print(f"People: {df['person_id'].nunique()}")
print(
    f"Frames: {df['frame'].min()} → "
    f"{df['frame'].max()}"
)


# ==========================================
# 3. OPEN ORIGINAL VIDEO
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
# 4. USE SAME RESOLUTION AS TRACKER
# ==========================================

MAX_WIDTH = 1920

if original_width > MAX_WIDTH:

    scale = MAX_WIDTH / original_width

    width = MAX_WIDTH
    height = int(
        original_height * scale
    )

else:

    width = original_width
    height = original_height


print(
    f"Video resolution: "
    f"{width} x {height}"
)

print(f"FPS: {fps}")

print(
    f"Total frames: {total_frames}"
)


# ==========================================
# 5. CREATE OUTPUT VIDEO
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
# 6. HEATMAP SETTINGS
# ==========================================

# Size of density grid

GRID_COLS = 32
GRID_ROWS = 18


# ==========================================
# 7. PROCESS EACH FRAME
# ==========================================

frame_number = 0


while True:

    ret, frame = cap.read()

    if not ret:
        break

    frame_number += 1


    # --------------------------------------
    # Resize frame
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
    # Get people in this frame
    # --------------------------------------

    frame_data = df[
        df["frame"] == frame_number
    ]


    # --------------------------------------
    # Create density grid
    # --------------------------------------

    density = np.zeros(
        (GRID_ROWS, GRID_COLS),
        dtype=np.float32
    )


    for _, person in frame_data.iterrows():

        x = int(person["center_x"])
        y = int(person["center_y"])


        # Convert pixel position
        # into grid position

        col = int(
            x / width * GRID_COLS
        )

        row = int(
            y / height * GRID_ROWS
        )


        # Keep coordinates inside grid

        col = max(
            0,
            min(
                col,
                GRID_COLS - 1
            )
        )

        row = max(
            0,
            min(
                row,
                GRID_ROWS - 1
            )
        )


        density[row, col] += 1


    # ======================================
    # CREATE HEATMAP
    # ======================================

    heatmap = cv2.resize(
        density,
        (width, height),
        interpolation=cv2.INTER_LINEAR
    )


    # Normalize heatmap

    if heatmap.max() > 0:

        heatmap = (
            heatmap
            / heatmap.max()
            * 255
        )

    heatmap = heatmap.astype(
        np.uint8
    )


    # Apply OpenCV heatmap colors

    heatmap_color = cv2.applyColorMap(
        heatmap,
        cv2.COLORMAP_JET
    )


    # ======================================
    # OVERLAY HEATMAP
    # ======================================

    output_frame = cv2.addWeighted(
        frame,
        0.55,
        heatmap_color,
        0.45,
        0
    )


    # ======================================
    # DRAW PEOPLE
    # ======================================

    for _, person in frame_data.iterrows():

        x = int(
            person["center_x"]
        )

        y = int(
            person["center_y"]
        )


        cv2.circle(
            output_frame,
            (x, y),
            5,
            (255, 255, 255),
            -1
        )


    # ======================================
    # TITLE
    # ======================================

    cv2.putText(
        output_frame,
        "Crowd Density Heatmap",
        (30, 45),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.1,
        (255, 255, 255),
        3
    )


    cv2.putText(
        output_frame,
        f"Frame: {frame_number}",
        (30, 85),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 255),
        2
    )


    cv2.putText(
        output_frame,
        f"People: {len(frame_data)}",
        (30, 120),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 255),
        2
    )


    # ======================================
    # SAVE FRAME
    # ======================================

    out.write(output_frame)


    # ======================================
    # PROGRESS
    # ======================================

    if frame_number % 30 == 0:

        print(
            f"Processed "
            f"{frame_number}/{total_frames}"
        )


# ==========================================
# 8. CLEANUP
# ==========================================

cap.release()
out.release()


print()
print("--------------------------------")
print("HEATMAP COMPLETE")
print("--------------------------------")

print(
    f"Output: {OUTPUT_PATH}"
)

print("--------------------------------")