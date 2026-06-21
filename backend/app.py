"""
app.py — FastAPI backend for Synthetic IR Object Detection
Deployed on Hugging Face Spaces (Docker SDK)

Flow:
  1. Receive RGB image from frontend
  2. Convert to synthetic IR (OpenCV)
  3. Run YOLOv8 inference
  4. Return annotated image + detection data as JSON
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from ultralytics import YOLO
import base64
import io
from PIL import Image
import os

app = FastAPI(title="Synthetic IR Detector")

# ── CORS — allow Vercel frontend ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your Vercel URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model once at startup ────────────────────────────────────────────────
MODEL_PATH = "yolov8_best.pt"  # upload this to HuggingFace Space files

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Model not found at {MODEL_PATH}. Upload yolov8_best.pt to the Space.")

model = YOLO(MODEL_PATH)
print(f"✅ Model loaded: {MODEL_PATH}")


# ── Synthetic IR conversion ───────────────────────────────────────────────────
def rgb_to_synthetic_ir(image_bgr, gamma=1.2, clip_limit=3.0,
                         tile_grid=(8, 8), blur_ksize=3):
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid)
    gray_clahe = clahe.apply(gray)

    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)], dtype="uint8")
    gray_gamma = cv2.LUT(gray_clahe, table)

    if blur_ksize > 0:
        if blur_ksize % 2 == 0:
            blur_ksize += 1
        gray_blurred = cv2.GaussianBlur(gray_gamma, (blur_ksize, blur_ksize), 0)
    else:
        gray_blurred = gray_gamma

    synthetic_ir = cv2.applyColorMap(gray_blurred, cv2.COLORMAP_INFERNO)
    return synthetic_ir


def encode_image_base64(image_bgr):
    _, buffer = cv2.imencode(".png", image_bgr)
    return base64.b64encode(buffer).decode("utf-8")


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "message": "Synthetic IR Detector API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read uploaded image
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    # Resize if too large (max 1280px)
    h, w = img_bgr.shape[:2]
    if max(h, w) > 1280:
        scale = 1280 / max(h, w)
        img_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)))

    # Step 1: Convert to synthetic IR
    synthetic_ir = rgb_to_synthetic_ir(img_bgr)

    # Step 2: Run YOLOv8 detection
    results = model(synthetic_ir, imgsz=640, verbose=False)[0]

    # Step 3: Draw bounding boxes on synthetic IR
    annotated = results.plot()

    # Step 4: Build detection list
    detections = []
    for box in results.boxes:
        detections.append({
            "confidence": round(float(box.conf[0]), 3),
            "bbox": [round(float(x), 1) for x in box.xyxy[0].tolist()],
            "class": results.names[int(box.cls[0])]
        })

    return JSONResponse({
        "synthetic_ir_image": encode_image_base64(synthetic_ir),
        "annotated_image":    encode_image_base64(annotated),
        "detections":         detections,
        "total_detected":     len(detections),
        "image_size":         {"width": img_bgr.shape[1], "height": img_bgr.shape[0]}
    })
