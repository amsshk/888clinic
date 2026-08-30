# MALI — 888+medical Lesion Triage Model

This folder is **888+medical's own copy** of the Dr Mali lesion-classification
research code (imported from `github.com/888derma/mali`). It is now part of this
project's repository and maintained here.

## What it does

Three-class dermoscopic lesion classification, following the ISIC 2017 task:

| Class | Type | Clinical note |
| --- | --- | --- |
| melanoma | malignant, melanocytic | urgent referral |
| nevus | benign, melanocytic | monitor |
| seborrheic keratosis | benign, keratinocytic | reassure |

Two evaluation tasks:
- `task_1` — probability the lesion is melanoma (malignant vs benign)
- `task_2` — probability the lesion is seborrheic keratosis (keratinocytic vs melanocytic)

## Contents

- `ground_truth.csv` — labels for the 600-image ISIC test set
- `sample_predictions.csv` — baseline submission (Cat 1: 0.526, Cat 2: 0.606, Cat 3: 0.566)
- `get_results.py` — ROC AUC + confusion matrix scoring for any submission
- `images/` — reference figures (class examples, ranking charts, sample plots)

## Scoring a model

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python get_results.py sample_predictions.csv        # default melanoma threshold 0.5
python get_results.py my_predictions.csv 0.4        # custom threshold
```

A submission CSV needs exactly 600 rows plus a header, columns `Id`, `task_1`,
`task_2`, in the same row order as `ground_truth.csv`.

## Training data

Images are not committed (multi-GB). ISIC 2017 splits:

- train — https://s3-us-west-1.amazonaws.com/udacity-dlnfd/datasets/skin-cancer/train.zip
- valid — https://s3-us-west-1.amazonaws.com/udacity-dlnfd/datasets/skin-cancer/valid.zip
- test — https://s3-us-west-1.amazonaws.com/udacity-dlnfd/datasets/skin-cancer/test.zip

Place them at `data/train`, `data/valid`, `data/test`, each with
`melanoma/`, `nevus/`, `seborrheic_keratosis/` subfolders. More data:
https://isic-archive.com/#images

## Training a model (`train.py`)

```bash
pip install torch torchvision pandas onnx
python train.py --data data --epochs 15 --tag effb0-run1
python get_results.py runs/effb0-run1/predictions.csv
```

Transfer learning on EfficientNet-B0 (or `--arch resnet50`), class-weighted loss,
light augmentation. Writes `runs/<tag>/best.pt`, `mali.onnx` and a 600-row
`predictions.csv`. Needs a GPU host — it will not run in the app runtime.

**Ship gate:** only wire a model into the app once its Category 3 mean AUC clears
~0.85. Below that, the Gemini pipeline already in production is the better signal.

## Serving it (`serve/`)

`serve/app.py` is a FastAPI + ONNX Runtime service exposing

```
POST /v1/lesion   Authorization: Bearer <MALI_API_KEY>
  { "image": "data:image/jpeg;base64,..." }
-> { "melanoma": 0.0-1.0, "seborrheic_keratosis": 0.0-1.0, "model_version": "..." }
```

Run it with `MALI_STUB=1` to exercise the app end-to-end before a model exists.
Fill in `serve/MODEL_CARD_TEMPLATE.md` for every exported model.

## How this relates to the live app

The patient-facing scanner at `/skin-ai` runs vision AI through the Lovable AI
Gateway. The app is already wired to consume this model as a **second opinion**:

- `src/lib/mali-inference.server.ts` calls the endpoint when the project secrets
  `MALI_API_URL` and `MALI_API_KEY` are set, and silently skips it otherwise.
- `src/lib/skin-ai.functions.ts` stores `mali_melanoma_prob`, `mali_sk_prob` and
  `mali_model_version` on the scan row, and lets the melanoma probability raise
  the urgency field only (never lower it).
- The results card and the PDF report show it as a labelled research aid with the
  model version.

Nothing under `ml/` ships to the app's serverless bundle.

## Ownership and licence

Owned and maintained by **888+medical**. Derived from Udacity's
`dermatologist-ai` mini-project, MIT licensed — the original notice is kept in
`LICENSE-UPSTREAM.txt` as the licence requires. Everything added here is
888+medical's.

Not a diagnostic device. Research and screening-aid use only.
