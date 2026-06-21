# Thermal Vision — Synthetic IR Object Detector

> Thermal vision without a thermal camera — synthetic IR object detection powered by YOLOv8.

Detects people in RGB images by converting them to synthetic infrared using OpenCV, then running a YOLOv8 model trained entirely on fake thermal data.

🔗 **Live Demo:** [ir-detector-frontend-9cjdfykbl-think-forge1505.vercel.app](https://ir-detector-frontend-9cjdfykbl-think-forge1505.vercel.app/)
🔗 **Backend API:** [nidhimushroom-synthetic-ir-detector.hf.space](https://nidhimushroom-synthetic-ir-detector.hf.space/)

---

## What This Project Does

Thermal cameras are expensive ($2,000–$10,000+) and thermal datasets are scarce compared to RGB datasets. This project asks:

> **Can we train an object detector using cheap, synthetic infrared images (generated from ordinary RGB photos via OpenCV) and still get usable results on real thermal images?**

We generate synthetic IR using classical image processing (no GANs, no learned translation model):
```
RGB → Grayscale → CLAHE → Gamma Correction → Gaussian Blur → INFERNO Colormap → Synthetic IR
```

We then train YOLOv8 entirely on this synthetic data and test it on real thermal (LWIR) images from the LLVIP dataset.

**Result: mAP@50 of 0.742** — recovering ~78% of the performance of models trained on real thermal data, at zero thermal-data-collection cost.

---

## Repository Structure

```
synthetic-ir-detector/
├── frontend/          → Next.js web app (deployed on Vercel)
├── backend/           → FastAPI inference API (deployed on Hugging Face Spaces)
├── notebooks/         → Colab notebooks for data generation + training
│   ├── week1_synthetic_ir_generation.ipynb
│   └── week2_yolov8_training.ipynb
└── docs/
    └── project_report.md
```

---

## Try It Yourself

1. Visit the [live demo](https://ir-detector-frontend-9cjdfykbl-think-forge1505.vercel.app/)
2. Upload any RGB image (ideally with people in it), or click a sample image
3. View the synthetic IR conversion + detection results side by side

---

## Running Locally

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Backend
```bash
cd backend
pip install -r requirements.txt
# place yolov8_best.pt in this folder
uvicorn app:app --reload --port 8000
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js, Tailwind CSS |
| Backend | FastAPI, Ultralytics YOLOv8, OpenCV |
| Model Training | Google Colab (T4 GPU) |
| Backend Hosting | Hugging Face Spaces (Docker) |
| Frontend Hosting | Vercel |
| Dataset | [LLVIP](https://github.com/bupt-ai-cz/LLVIP) |

---

## Results Summary

| Metric | Value |
|--------|-------|
| mAP@50 | 0.742 |
| mAP@50-95 | 0.403 |
| Precision | 0.822 |
| Recall | 0.663 |

Full methodology, literature comparison, and discussion in [`docs/project_report.md`](./docs/project_report.md).

---

## Limitations & Future Work

- Single class detection (person only)
- Synthetic IR brightness ≠ real thermal heat signature
- No fine-tuning experiment on small real-IR samples (promising next step)
- Vision Transformer comparison descoped due to time constraints

See full report for details.
