import torch
import cv2

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
# 2. Input image
# -----------------------------

IMAGE_PATH = "videos/test.jpg"

image = Image.open(IMAGE_PATH).convert("RGB")

print(f"Image loaded: {IMAGE_PATH}")
print(f"Image size: {image.size}")


# -----------------------------
# 3. Run detection
# -----------------------------

inputs = processor(images=image, return_tensors="pt")

with torch.no_grad():
    outputs = model(**inputs)


# -----------------------------
# 4. Convert model output
# -----------------------------

target_sizes = torch.tensor([image.size[::-1]])

results = processor.post_process_object_detection(
    outputs,
    target_sizes=target_sizes,
    threshold=0.30
)[0]


# -----------------------------
# 5. Draw ONLY people
# -----------------------------

image_cv = cv2.imread(IMAGE_PATH)

person_count = 0

for score, label, box in zip(
    results["scores"],
    results["labels"],
    results["boxes"]
):

    label_name = model.config.id2label[label.item()]

    if label_name.lower() != "person":
        continue

    score = score.item()

    x1, y1, x2, y2 = [
        int(value) for value in box.tolist()
    ]

    person_count += 1

    # Draw bounding box
    cv2.rectangle(
        image_cv,
        (x1, y1),
        (x2, y2),
        (0, 255, 0),
        2
    )

    # Label
    text = f"Person {score:.2f}"

    cv2.putText(
        image_cv,
        text,
        (x1, max(y1 - 10, 20)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (0, 255, 0),
        2
    )


# -----------------------------
# 6. Save result
# -----------------------------

OUTPUT_PATH = "videos/detected.jpg"

cv2.imwrite(OUTPUT_PATH, image_cv)

print()
print("-----------------------------")
print(f"People detected: {person_count}")
print(f"Result saved to: {OUTPUT_PATH}")
print("-----------------------------")