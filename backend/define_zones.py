import cv2
import json


VIDEO_PATH = "videos/crowd.mp4"
OUTPUT_PATH = "videos/zones.json"

MAX_WIDTH = 1920


# ==========================================
# GLOBAL STATE
# ==========================================

frame = None
display_frame = None

points = []
zones = []

zone_name = "Zone 1"


# ==========================================
# MOUSE CALLBACK
# ==========================================

def mouse_callback(event, x, y, flags, param):

    global display_frame

    if event == cv2.EVENT_LBUTTONDOWN:

        points.append((x, y))

        cv2.circle(
            display_frame,
            (x, y),
            6,
            (0, 255, 0),
            -1
        )

        if len(points) > 1:

            cv2.line(
                display_frame,
                points[-2],
                points[-1],
                (0, 255, 0),
                2
            )

        cv2.imshow(
            "Define CrowdFlow Zones",
            display_frame
        )


# ==========================================
# OPEN VIDEO
# ==========================================

cap = cv2.VideoCapture(VIDEO_PATH)

if not cap.isOpened():

    raise RuntimeError(
        f"Could not open {VIDEO_PATH}"
    )


ret, frame = cap.read()

cap.release()


if not ret:

    raise RuntimeError(
        "Could not read first video frame."
    )


# ==========================================
# RESIZE
# ==========================================

original_width = frame.shape[1]
original_height = frame.shape[0]


if original_width > MAX_WIDTH:

    scale = MAX_WIDTH / original_width

    width = MAX_WIDTH
    height = int(original_height * scale)

    frame = cv2.resize(
        frame,
        (width, height),
        interpolation=cv2.INTER_AREA
    )

else:

    width = original_width
    height = original_height


# ==========================================
# CREATE WINDOW
# ==========================================

display_frame = frame.copy()

cv2.namedWindow(
    "Define CrowdFlow Zones"
)

cv2.setMouseCallback(
    "Define CrowdFlow Zones",
    mouse_callback
)


print()
print("==========================================")
print("CROWDFLOW ZONE EDITOR")
print("==========================================")
print()
print("Click points to create a polygon.")
print()
print("Controls:")
print()
print("ENTER  → save current zone")
print("R      → reset current polygon")
print("Q      → finish and save")
print()
print("Example:")
print("Click around a corridor → ENTER")
print("Click around a gate     → ENTER")
print("Click around an exit    → ENTER")
print()


# ==========================================
# INTERACTION LOOP
# ==========================================

while True:

    cv2.imshow(
        "Define CrowdFlow Zones",
        display_frame
    )

    key = cv2.waitKey(1) & 0xFF


    # --------------------------------------
    # ENTER → save zone
    # --------------------------------------

    if key == 13:

        if len(points) < 3:

            print(
                "Need at least 3 points."
            )

            continue


        zone = {
            "name": zone_name,
            "polygon": points.copy()
        }


        zones.append(zone)


        print(
            f"Saved {zone_name}: "
            f"{len(points)} points"
        )


        # Draw saved polygon

        cv2.polylines(
            display_frame,
            [
                __import__("numpy").array(
                    points,
                    dtype="int32"
                )
            ],
            True,
            (255, 255, 0),
            3
        )


        # Label zone

        center_x = int(
            sum(x for x, y in points)
            / len(points)
        )

        center_y = int(
            sum(y for x, y in points)
            / len(points)
        )


        cv2.putText(
            display_frame,
            zone_name,
            (center_x, center_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 0),
            2
        )


        # Next zone

        zone_name = (
            f"Zone {len(zones) + 1}"
        )


        points = []


    # --------------------------------------
    # R → reset current polygon
    # --------------------------------------

    elif key == ord("r"):

        points = []

        display_frame = frame.copy()


        # redraw saved zones

        for zone in zones:

            polygon = zone["polygon"]

            cv2.polylines(
                display_frame,
                [
                    __import__("numpy").array(
                        polygon,
                        dtype="int32"
                    )
                ],
                True,
                (255, 255, 0),
                3
            )


        print(
            "Current polygon reset."
        )


    # --------------------------------------
    # Q → finish
    # --------------------------------------

    elif key == ord("q"):

        break


# ==========================================
# SAVE
# ==========================================

cv2.destroyAllWindows()


with open(
    OUTPUT_PATH,
    "w"
) as f:

    json.dump(
        {
            "video_width": width,
            "video_height": height,
            "zones": zones
        },
        f,
        indent=4
    )


print()
print("==========================================")
print("ZONES SAVED")
print("==========================================")

print(
    f"Zones created: {len(zones)}"
)

print(
    f"Saved to: {OUTPUT_PATH}"
)