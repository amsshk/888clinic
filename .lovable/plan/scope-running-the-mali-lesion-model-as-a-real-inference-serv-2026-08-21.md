# Scope: running the MALI lesion model as a real inference service

## What's actually in the repo today

`ml/mali/` (from `github.com/888derma/mali`) contains **no trained model** — no
weights, no training script, no network definition. It holds:

- `ground_truth.csv` — labels for the 600-image ISIC 2017 test set
- `sample_predictions.csv` — a baseline submission (AUC ≈ 0.53 / 0.61 / 0.57)
- `get_results.py` — a scorer (ROC AUC + confusion matrix)
- reference figures, and download links for the ISIC train/valid/test images

So there is nothing to host yet. The scoring numbers in the README are for a
near-random baseline — well below anything that should touch a patient-facing
result. Two pieces of work follow from that: train a model, then serve it.

## Phase 1 — Train a MALI classifier (offline, outside this app)

1. Download the three ISIC 2017 zips into `ml/mali/data/{train,valid,test}`.
2. Add a training script: transfer learning on an ImageNet backbone
   (EfficientNet-B0 or ResNet-50), 3 classes, class-weighted loss for the
   melanoma imbalance, light augmentation (flip/rotate/colour jitter).
3. Emit `predictions.csv` for the 600 test images and score it with the
   existing `get_results.py`.
4. Gate: only proceed if Category 3 (mean AUC) clears ~0.85. Below that, the
   Gemini pipeline already in production is the better clinical signal.
5. Export the winning run as ONNX plus a `model_card.md` (dataset, metrics,
   thresholds, known failure modes — dermoscopic images only, skin-tone bias).

This phase needs a GPU and cannot run in the app's serverless runtime, or in
this sandbox. It's a separate research task; the app is untouched by it.

## Phase 2 — Serve it

The Cloudflare Worker backend can't load PyTorch/ONNX weights, so the model
lives behind an HTTP endpoint the app calls:

- A small FastAPI (or ONNX Runtime) container on a GPU/CPU host of your
  choosing, exposing `POST /v1/lesion` → `{ melanoma: 0.0-1.0,
  seborrheic_keratosis: 0.0-1.0, model_version }`.
- Auth by a shared bearer token stored as a project secret (`MALI_API_KEY`),
  never in client code.
- Images sent as base64 from the server function only — the browser never
  talks to the inference host.

## Phase 3 — Wire it into the scan pipeline as a second opinion

In `src/lib/skin-ai.functions.ts`, after the Gemini pass:

1. If `MALI_API_KEY` and `MALI_API_URL` are set, call the endpoint with the
   same image. If either is missing, or the call fails/times out, skip it —
   the scan must never fail because MALI is down.
2. Store `mali_melanoma_prob`, `mali_sk_prob`, and `mali_model_version` on the
   scan row (new nullable columns).
3. Escalate the urgency field only in one direction: a high melanoma
   probability can raise urgency to "see a doctor promptly"; MALI never lowers
   an urgency Gemini already raised.
4. Report and UI show it as a labelled second opinion with its model version
   and a "research aid, not a diagnosis" line — no bare percentage presented
   as a verdict.

## Technical notes

- New DB columns on the scan table (nullable, no backfill).
- Two new secrets: `MALI_API_URL`, `MALI_API_KEY`.
- Inference call happens server-side inside the handler, with no artificial
  timeout race that would drop a slow-but-valid response; failure is silent
  and logged.
- `ml/mali/` stays research-only in this repo — nothing under it ships to the
  Worker bundle.

## What I can do right now

Phases 2 and 3 are buildable today against a stub endpoint, so the plumbing,
DB columns, UI badge, and report line are ready and tested before the model
exists. Phase 1 (training) is yours or a data-science engagement's — I can
write the training script, but running it needs a GPU outside Lovable.
