# MALI lesion classifier — model card

Copy this next to each exported `mali.onnx` and fill it in before the model is
allowed to feed the patient-facing scanner.

## Identity
- Model version (must match `MALI_MODEL_VERSION`):
- Architecture / backbone:
- Training run date:
- Exported artefact + checksum:

## Intended use
Three-class lesion triage (melanoma / nevus / seborrheic keratosis) as a
**second opinion** inside the 888clinic AI scan. It may raise the recommended
review urgency; it never lowers it, and it never appears as a diagnosis.

## Data
- Training / validation / test sets (ISIC 2017 splits, counts per class):
- Any additional data sources:

## Metrics (from `get_results.py`)
| Category | AUC |
| --- | --- |
| Cat 1 — melanoma vs benign | |
| Cat 2 — keratinocytic vs melanocytic | |
| Cat 3 — mean | |

Ship gate: Category 3 ≥ 0.85. Below that, do not enable the endpoint.

## Thresholds used in the app
- melanoma ≥ 0.40 → urgency raised to "soon"
- melanoma ≥ 0.70 → urgency raised to "urgent"

(Defined in `src/lib/mali-inference.server.ts`; revise together with the metrics.)

## Known limitations
- Trained on dermoscopic images; smartphone photos are out of distribution.
- ISIC 2017 skews to lighter skin tones — expect degraded performance on darker
  skin, and say so in patient-facing copy.
- Three classes only: any other lesion type is forced into one of them.
- No calibration guarantee; probabilities are relative scores, not risk.

## Review
- Reviewed by (clinician):
- Date:
- Decision (enable / reject):
