import cv2
import torch

from PIL import Image
from transformers import RTDetrImageProcessor, RTDetrForObjectDetection


# -----------------------------
# 1. Model
# -----------------------------

MODEL_NAME = "PekingU/rtdetr_r18vd_coco_o365"

print("Loading Hugging Face model...")

processor = RTDetrImageProcessor.from_pretrained(MODEL_NAME)
model = RTDetrForObjectDetection.from_pretrained(MODEL_NAME)

model.eval()

print("Model loaded successfully!")


# -----------------------------
# 2. Video
# -----------------------------

VIDEO_PATH = "videos/crowd.mp4"
OUTPUT_PATH = "videos/crowd_detected.mp4"

cap = cv2.VideoCapture(VIDEO_PATH)

if not cap.isOpened():
    raise RuntimeError(f"Could not open video: {VIDEO_PATH}")


fps = cap.get(cv2.CAP_PROP_FPS)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

print(f"Video opened successfully!")
print(f"Resolution: {width} x {height}")
print(f"FPS: {fps}")
print(f"Total frames: {total_frames}")


# -----------------------------
# 3. Output video
# -----------------------------

fourcc = cv2.VideoWriter_fourcc(*"mp4v")

out = cv2.VideoWriter(
    OUTPUT_PATH,
    fourcc,
    fps,
    (width, height)
)


# -----------------------------
# 4. Process frames
# -----------------------------

frame_number = 0

while True:

    ret, frame = cap.read()

    if not ret:
        break

    frame_number += 1

    # OpenCV BGR → RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    image = Image.fromarray(rgb_frame)

    # Prepare image for RT-DETR
    inputs = processor(
        images=image,
        return_tensors="pt"
    )

    # Run model
    with torch.no_grad():
        outputs = model(**inputs)

    # Convert detections back to image coordinates
    target_sizes = torch.tensor(
        [[height, width]]
    )

    results = processor.post_process_object_detection(
        outputs,
        target_sizes=target_sizes,
        threshold=0.30
    )[0]


    # -----------------------------
    # Draw people
    # -----------------------------

    person_count = 0

    for score, label, box in zip(
        results["scores"],
        results["labels"],
        results["boxes"]
    ):

        label_name = model.config.id2label[label.item()]

        if label_name.lower() != "person":
            continue

        person_count += 1

        x1, y1, x2, y2 = [
            int(value) for value in box.tolist()
        ]

        # Bounding box
        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

        # Confidence
        text = f"Person {score.item():.2f}"

        cv2.putText(
            frame,
            text,
            (x1, max(y1 - 10, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 255, 0),
            2
        )


    # -----------------------------
    # Crowd count
    # -----------------------------

    cv2.putText(
        frame,
        f"People: {person_count}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 0),
        2
    )


    # Write frame
    out.write(frame)


    # Progress
    if frame_number % 10 == 0:

        print(
            f"Processed {frame_number}/{total_frames} "
            f"| People: {person_count}"
        )


# -----------------------------
# 5. Cleanup
# -----------------------------

cap.release()
out.release()

print()
print("--------------------------------")
print("VIDEO PROCESSING COMPLETE")
print(f"Output: {OUTPUT_PATH}")
print("--------------------------------")