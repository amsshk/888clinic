# MALI service — deployment

This is 888clinic's own inference host. The web app never loads model weights; it
only speaks HTTP to this service using two secrets:

| Secret | Value |
| --- | --- |
| `MALI_API_URL` | public base URL of this service, e.g. `https://mali.888clinic.co` |
| `MALI_API_KEY` | shared bearer token; set the same value as `MALI_API_KEY` here |

Endpoints:

```
GET  /health
POST /v1/lesion             lesion triage (ONNX classifier from train.py)
POST /v1/aesthetic-preview  botox / filler before-and-after render
```

## 1. CPU host (lesion + warp preview)

Enough for lesion triage and the deterministic geometric preview.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export MALI_MODEL=/models/mali.onnx        # from `python train.py`
export MALI_MODEL_VERSION=effb0-run1
export MALI_API_KEY=$(openssl rand -hex 24)
uvicorn app:app --host 0.0.0.0 --port 8080
```

No trained model yet? Run `MALI_STUB=1 uvicorn app:app ...` — lesion returns fixed
mid-range probabilities and the preview still renders, so the whole app flow
(credits, PDF, admin tabs) can be tested end to end.

## 2. GPU host (photoreal preview)

Stage 2 makes the warp read as a photograph. It is a **renderer only** — the shape
change is decided by the FaceMesh landmarks and the app's dose rules in stage 1,
and stage 2 may only repaint pixels inside the treated-zone mask.

Recommended engine: **SDXL inpainting + ControlNet Canny + IP-Adapter face
embedding**. ~12-16GB VRAM.

```bash
pip install torch diffusers transformers accelerate safetensors
export MALI_REFINER=sdxl
export MALI_SDXL_MODEL=diffusers/stable-diffusion-xl-1.0-inpainting-0.1
export MALI_CONTROLNET_MODEL=diffusers/controlnet-canny-sdxl-1.0
export MALI_CONTROLNET_SCALE=0.8      # structure lock: raise to hold bone edges harder
export MALI_IP_ADAPTER_SCALE=0.6      # identity lock from the patient's own face
export MALI_REFINER_STEPS=28
export MALI_REFINER_STRENGTH=0.35     # keep low: this is a finish, not a redraw
export MALI_REFINER_GUIDANCE=5.0
uvicorn app:app --host 0.0.0.0 --port 8080
```

Why this stack and not Midjourney / DALL·E: inpainting edits only the selected
zones, ControlNet keeps the patient's own edges, IP-Adapter keeps the face, and it
all runs on your own host — face photos never leave the clinic.

Three separate identity guards, so a hallucinating model cannot change the patient:

1. the inpaint mask — only treated zones are paintable;
2. ControlNet Canny — the model must redraw the edges it was handed;
3. a final composite through the same feathered mask — untreated pixels come from
   the warp, not from the diffusion model.

Alternative engine: `MALI_REFINER=qwen` (`MALI_REFINER_MODEL=Qwen/Qwen-Image-Edit`,
Apache 2.0, ~24GB VRAM) — a whole-image editor, still mask-composited on the way
out. `FLUX.1 Kontext [dev]` renders slightly better but its licence is
non-commercial — only use it with a Black Forest Labs commercial licence.

If stage 2 is off or fails, the service returns the warp-only render and reports
`stages: ["warp"]`, and the app labels the result as a geometric simulation.

### Tuning for realism

| Symptom | Change |
| --- | --- |
| Result looks like a different person | lower `MALI_REFINER_STRENGTH` to 0.2-0.28, raise `MALI_CONTROLNET_SCALE` to 0.9 |
| Result looks plastic / filtered | lower `MALI_REFINER_STRENGTH`, lower `MALI_REFINER_GUIDANCE` to ~4.0 |
| Change is invisible | the dose rules own the amount — raise the plan, not the strength |
| Edited zone edges visible | raise `MALI_REFINER_STEPS`, keep the mask dilation as shipped |


## 3. Docker

```bash
docker build -t mali-serve .
docker run -p 8080:8080 \
  -e MALI_API_KEY=... -e MALI_MODEL_VERSION=effb0-run1 \
  -v /models:/models mali-serve
```

For the GPU build add `--gpus all` and the stage-2 env vars above.

## 4. Ship gate

Only point the app at a lesion model whose Category 3 mean AUC (from
`get_results.py`) clears ~0.85. Fill in `MODEL_CARD_TEMPLATE.md` for every export.

## 5. Verify from the clinic side

In the admin console → **Dr Mali engine** tab: the health panel shows both
endpoints, the live model version and which preview stages are loaded, and the
test button runs a real photo through `/v1/aesthetic-preview`.

Not a diagnostic device. Research and screening-aid use only.
