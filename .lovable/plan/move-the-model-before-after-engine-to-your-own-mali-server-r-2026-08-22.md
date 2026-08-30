# Move the model + before/after engine to your own MALI server (reports stay on Lovable AI)

Goal: your own self-hosted MALI service becomes the engine for (1) the uploaded lesion model and (2) the botox/filler before & after render. Lovable AI keeps doing only what it is good at here — writing the report wording, the clinical narrative, and the PDF text.

## What exists today

- `ml/mali/` (your GitHub repo, now in this project) has the lesion classifier: `train.py` exports `mali.onnx`, and `serve/app.py` is a FastAPI + ONNX service exposing `POST /v1/lesion`.
- `src/lib/mali-inference.server.ts` already calls that service when the secrets `MALI_API_URL` / `MALI_API_KEY` are set, and silently skips it otherwise.
- `src/lib/scan-pipeline.server.ts` blends the MALI verdict with the Lovable AI reading.
- The before & after tool (`src/lib/aesthetic-ai.functions.ts`) renders images with Lovable AI (Gemini image) — the GitHub repo has **no** image-generation model, so this part needs a new engine.

## Which open-source engine to use for before & after

Recommendation, based on licence and quality:

1. **Qwen-Image-Edit (Apache 2.0)** — instruction-based image editing, 20B, open weights, and Apache 2.0 means it is safe for commercial clinic use. This is the primary recommendation.
2. **FLUX.1 Kontext [dev]** — arguably the best editing quality on consumer GPUs, but its licence is non-commercial; a paid BFL licence is required for a clinic product. Only pick this if you buy that licence.
3. **MediaPipe FaceMesh geometric warp (Apache 2.0)** — not photoreal, but deterministic and clinically honest: volume/lift per injection zone computed from the dose, applied as a mesh warp. Fast, cheap, runs on CPU.

Plan: build the engine as **warp first, diffusion second** — the FaceMesh warp produces the anatomically correct geometry from your dose map, then Qwen-Image-Edit refines it into a photoreal render. That combination is what keeps results plausible instead of "prettier face". The warp alone is also the automatic degraded mode when the GPU is busy.

Hardware: Qwen-Image-Edit needs a GPU with roughly 24 GB+ VRAM (or a quantised build). One rented GPU box (e.g. RunPod / Vast / a Thai colo box) can serve both endpoints.

## Lesion model behaviour when your server is offline

Recommended: **fail closed, but visibly** — no scan credit is consumed, the patient sees "the clinical scanner is offline, try again shortly", and the admin console shows the outage. This is the only version where you can honestly say every verdict comes from your trained model. To avoid ever showing patients a dead tool, the admin console gets a switch to temporarily allow the Lovable AI fallback, and any report produced that way is stamped as a screening-aid reading rather than a MALI verdict.

## Build steps

1. **Extend your MALI service** (`ml/mali/serve/`)
   - Add `POST /v1/aesthetic-preview`: input = photo, injection zones, product, units/ml, patient info; output = rendered after-image + the conservative/typical/best-case range.
   - Stage 1 FaceMesh warp per zone (dose to displacement), stage 2 optional Qwen-Image-Edit refinement, masked so only treated zones can change.
   - Keep `/health` reporting which stages are loaded so the app knows if the GPU stage is available.
   - Add a `MALI_STUB=1` path so the whole app flow can be tested before the GPU box exists.
2. **New app client** `src/lib/mali-aesthetic.server.ts` — bearer-token call to `/v1/aesthetic-preview`, strict response validation, no silent Lovable AI image fallback.
3. **Rewire `src/lib/aesthetic-ai.functions.ts`** — the render comes from your server; Lovable AI is reduced to writing the plan text and patient wording around the returned image. If the server is unreachable: no credit spent, clear "simulator offline" message.
4. **Make the lesion path MALI-first properly** (`src/lib/scan-pipeline.server.ts`) — the MALI verdict is the diagnosis, Lovable AI only writes the report; fail closed when there is no verdict, unless the admin fallback switch is on.
5. **Admin console** — in the existing MALI model tab: service health for both endpoints, active model version, the fallback switch, and a test button for the preview endpoint.
6. **Deployment docs** — `ml/mali/serve/README` steps for the GPU host, model weights, secrets (`MALI_API_URL`, `MALI_API_KEY`), and the ship gate (only go live once your classifier's Category 3 mean AUC clears ~0.85).
7. **Reports stay as they are** — scan PDF and patient records keep the current Lovable AI wording pipeline and clinic branding, just now labelled with your model version.

## Technical notes

- Secrets `MALI_API_URL` and `MALI_API_KEY` already exist in the wiring; the same pair serves both endpoints.
- Rendering can take 20-60s on a GPU, so the preview call streams or polls, and the existing "Dr Mali is simulating your result" waiting UI stays.
- Nothing under `ml/` ships in the app bundle — the app only speaks HTTP to your host.
- Prediction ranges stay conservative/typical/best-case, never a fixed accuracy claim.

## What you need to provide

- A GPU host (rented is fine) for the preview stage.
- Your trained `mali.onnx` from `train.py` for the lesion stage — until then the stub keeps the plumbing testable.
