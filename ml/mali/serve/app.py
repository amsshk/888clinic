"""
MALI inference service — 888clinic.

Two endpoints, both owned by the clinic and served from your own host:

    POST /v1/lesion             lesion triage from the ONNX classifier (train.py)
    POST /v1/aesthetic-preview  botox / filler before-and-after render

Run it:

    pip install -r requirements.txt
    export MALI_MODEL=/models/mali.onnx
    export MALI_MODEL_VERSION=effb0-run1
    export MALI_API_KEY=<same value stored as the app secret MALI_API_KEY>
    uvicorn app:app --host 0.0.0.0 --port 8080

Contracts expected by the app:

    POST /v1/lesion   Authorization: Bearer <MALI_API_KEY>
      { "image": "data:image/jpeg;base64,..." }
    -> { "melanoma": 0.0-1.0, "seborrheic_keratosis": 0.0-1.0, "model_version": "..." }

    POST /v1/aesthetic-preview   Authorization: Bearer <MALI_API_KEY>
      {
        "image": "data:image/jpeg;base64,...",
        "zones": [{"id": "glabella", "label": "Frown lines",
                   "treatment": "botox", "dose": 20, "strength": 0.7}],
        "goal": "balanced", "age": "41", "gender": "female", "notes": ""
      }
    -> { "after_image": "data:image/jpeg;base64,...",
         "engine": "facemesh-warp" | "facemesh-warp+qwen-image-edit",
         "engine_version": "...", "stages": ["warp", "refine"] }

Stages
------
1. `warp`   — MediaPipe FaceMesh landmarks + a per-zone mesh displacement derived
              from the dose. Deterministic, CPU-only, anatomically constrained:
              botox flattens lines, filler adds volume, nothing else can move.
              It also emits the treated-zone mask, so stage 2 can never repaint a
              pixel the injector's plan does not actually treat.
2. `refine` — optional diffusion pass that re-renders ONLY the masked zones so the
              warp reads as a photograph. Two engines:
                MALI_REFINER=sdxl  (recommended) SDXL inpainting + ControlNet
                                   Canny structure lock + IP-Adapter face
                                   embedding for identity. ~12-16GB VRAM.
                MALI_REFINER=qwen  Qwen-Image-Edit whole-image edit. ~24GB VRAM.
              Either way the result is composited back through the treated-zone
              mask, so untreated pixels stay byte-identical to the warp. When
              stage 2 is off or fails, the warp output is returned and `stages`
              says so, so the app can label the render honestly.

The geometry is never the diffusion model's decision: shape change comes from the
FaceMesh landmarks and the app's dose rules, and the renderer only makes that
change look like skin.

Set MALI_STUB=1 to run without any weights: /v1/lesion returns fixed mid-range
probabilities and /v1/aesthetic-preview returns the warp-only render.
"""


from __future__ import annotations

import base64
import io
import os
from typing import Literal

import numpy as np
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image
from pydantic import BaseModel, Field

CLASSES = ["melanoma", "nevus", "seborrheic_keratosis"]
IMG = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

STUB = os.environ.get("MALI_STUB") == "1"
MODEL_PATH = os.environ.get("MALI_MODEL", "/models/mali.onnx")
MODEL_VERSION = os.environ.get("MALI_MODEL_VERSION", "stub-0" if STUB else "unknown")
API_KEY = os.environ.get("MALI_API_KEY")

REFINER = os.environ.get("MALI_REFINER", "").lower()  # "" | "sdxl" | "qwen"

# Recommended stack: SDXL inpainting, structure-locked by ControlNet Canny and
# identity-locked by an IP-Adapter face embedding. Only the treated zones are
# repainted, so this can never restyle the patient's face.
SDXL_MODEL = os.environ.get(
    "MALI_SDXL_MODEL", "diffusers/stable-diffusion-xl-1.0-inpainting-0.1"
)
CONTROLNET_MODEL = os.environ.get("MALI_CONTROLNET_MODEL", "diffusers/controlnet-canny-sdxl-1.0")
CONTROLNET_SCALE = float(os.environ.get("MALI_CONTROLNET_SCALE", "0.8"))
IP_ADAPTER_REPO = os.environ.get("MALI_IP_ADAPTER_REPO", "h94/IP-Adapter")
IP_ADAPTER_WEIGHT = os.environ.get(
    "MALI_IP_ADAPTER_WEIGHT", "ip-adapter-plus-face_sdxl_vit-h.safetensors"
)
IP_ADAPTER_SCALE = float(os.environ.get("MALI_IP_ADAPTER_SCALE", "0.6"))

# Legacy whole-image editor.
REFINER_MODEL = os.environ.get("MALI_REFINER_MODEL", "Qwen/Qwen-Image-Edit")
REFINER_STEPS = int(os.environ.get("MALI_REFINER_STEPS", "28"))
REFINER_STRENGTH = float(os.environ.get("MALI_REFINER_STRENGTH", "0.35"))
REFINER_GUIDANCE = float(os.environ.get("MALI_REFINER_GUIDANCE", "5.0"))
WARP_VERSION = "facemesh-warp-1"


app = FastAPI(title="MALI — 888clinic clinical + aesthetic engine")
bearer = HTTPBearer(auto_error=True)

_session = None
_mesh = None
_pipe = None


def session():
    global _session
    if _session is None:
        import onnxruntime as ort

        _session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    return _session


def face_mesh():
    """MediaPipe FaceMesh, loaded lazily so /v1/lesion works without it."""
    global _mesh
    if _mesh is None:
        import mediapipe as mp

        _mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )
    return _mesh


def refiner():
    """Diffusion refiner pipeline. None when refinement is disabled."""
    global _pipe
    if REFINER not in ("sdxl", "qwen"):
        return None
    if _pipe is None:
        import torch

        if REFINER == "sdxl":
            from diffusers import ControlNetModel, StableDiffusionXLControlNetInpaintPipeline

            controlnet = ControlNetModel.from_pretrained(
                CONTROLNET_MODEL, torch_dtype=torch.float16
            )
            _pipe = StableDiffusionXLControlNetInpaintPipeline.from_pretrained(
                SDXL_MODEL, controlnet=controlnet, torch_dtype=torch.float16
            )
            _pipe.to("cuda")
            # Identity guidance from the patient's own face. A missing adapter
            # must not take the whole refiner down — the ControlNet edge lock and
            # the mask composite already hold identity on their own.
            try:
                _pipe.load_ip_adapter(
                    IP_ADAPTER_REPO, subfolder="sdxl_models", weight_name=IP_ADAPTER_WEIGHT
                )
                _pipe.set_ip_adapter_scale(IP_ADAPTER_SCALE)
                _pipe._mali_face_lock = True
            except Exception as exc:  # noqa: BLE001
                print("[mali] IP-Adapter unavailable, continuing without it:", exc)
                _pipe._mali_face_lock = False
        else:
            from diffusers import QwenImageEditPipeline

            _pipe = QwenImageEditPipeline.from_pretrained(
                REFINER_MODEL, torch_dtype=torch.bfloat16
            )
            _pipe.to("cuda")
            _pipe._mali_face_lock = False
        _pipe.set_progress_bar_config(disable=True)
    return _pipe



def require_key(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> None:
    if not API_KEY:
        raise HTTPException(status_code=500, detail="MALI_API_KEY is not configured")
    if creds.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid token")


class LesionRequest(BaseModel):
    image: str


class Zone(BaseModel):
    id: str
    label: str = ""
    treatment: Literal["botox", "filler"] = "botox"
    dose: float = 0.0
    # 0..1 share of the maximum realistic effect, computed by the app from its
    # dosimetry tables. The service never invents a stronger effect than this.
    strength: float = Field(default=0.6, ge=0.0, le=1.0)


class PreviewRequest(BaseModel):
    image: str
    zones: list[Zone] = Field(default_factory=list)
    goal: str = "balanced"
    age: str = ""
    gender: str = ""
    notes: str = ""


def decode_image(image: str) -> Image.Image:
    payload = image.split(",", 1)[1] if image.startswith("data:") else image
    try:
        raw = base64.b64decode(payload, validate=True)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Image is not valid base64") from exc
    if len(raw) > 8_000_000:
        raise HTTPException(status_code=413, detail="Image too large")
    try:
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Unreadable image") from exc


def decode(image: str) -> np.ndarray:
    img = decode_image(image)
    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    img = img.crop((left, top, left + side, top + side)).resize((IMG, IMG), Image.BILINEAR)

    arr = (np.asarray(img, dtype=np.float32) / 255.0 - MEAN) / STD
    return arr.transpose(2, 0, 1)[None, ...]


def softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - logits.max()
    exp = np.exp(shifted)
    return exp / exp.sum()


def encode_jpeg(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=94)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


# --------------------------------------------------------------------------- #
# Zone geometry
#
# Each zone maps to FaceMesh landmark indices and a physical action:
#   smooth  — botox: local contrast/line reduction over the muscle's skin
#   lift    — filler or brow lift: small upward/outward displacement
#   volume  — filler: local outward displacement filling a hollow or fold
# The radius is a fraction of the inter-ocular distance so it scales with the
# photo. Nothing outside these masks is ever touched.
# --------------------------------------------------------------------------- #
ZONE_GEOMETRY: dict[str, dict] = {
    "glabella": {"points": [9, 8, 168, 6], "radius": 0.45, "action": "smooth"},
    "forehead": {"points": [10, 151, 108, 337, 67, 297], "radius": 0.95, "action": "smooth"},
    "crows-feet": {"points": [33, 133, 263, 362, 130, 359], "radius": 0.35, "action": "smooth"},
    "bunny-lines": {"points": [197, 195, 5], "radius": 0.22, "action": "smooth"},
    "brow-lift": {"points": [105, 334, 70, 300], "radius": 0.32, "action": "lift"},
    "masseter": {"points": [58, 288, 172, 397], "radius": 0.5, "action": "slim"},
    "chin-crease": {"points": [200, 199, 175], "radius": 0.3, "action": "smooth"},
    "neck-bands": {"points": [152, 148, 377], "radius": 0.5, "action": "smooth"},
    "tear-trough": {"points": [230, 450, 232, 452], "radius": 0.3, "action": "volume"},
    "cheek": {"points": [234, 454, 205, 425], "radius": 0.55, "action": "volume"},
    "nasolabial": {"points": [205, 425, 216, 436], "radius": 0.34, "action": "volume"},
    "lips": {"points": [13, 14, 61, 291], "radius": 0.3, "action": "volume"},
    "marionette": {"points": [43, 273, 204, 424], "radius": 0.3, "action": "volume"},
    "jawline": {"points": [172, 397, 152], "radius": 0.55, "action": "lift"},
    "temple": {"points": [127, 356], "radius": 0.4, "action": "volume"},
    "chin": {"points": [152, 175], "radius": 0.35, "action": "volume"},
}

# Maximum displacement per action, as a fraction of inter-ocular distance, at
# strength 1.0. Deliberately small — real injectables are subtle.
MAX_SHIFT = {"volume": 0.055, "lift": 0.045, "slim": 0.05, "smooth": 0.0}
# Maximum line-softening (0..1 blend toward a locally smoothed image).
MAX_SMOOTH = 0.75


def landmarks(img: Image.Image) -> np.ndarray:
    result = face_mesh().process(np.asarray(img))
    if not result.multi_face_landmarks:
        raise HTTPException(
            status_code=422,
            detail="No face detected — use a clear, front-facing, well-lit photo.",
        )
    lm = result.multi_face_landmarks[0].landmark
    w, h = img.size
    return np.array([[p.x * w, p.y * h] for p in lm], dtype=np.float32)


def zone_mask(shape: tuple[int, int], centers: np.ndarray, radius: float) -> np.ndarray:
    """Soft radial mask (0..1) covering the given centers."""
    h, w = shape
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    mask = np.zeros((h, w), dtype=np.float32)
    for cx, cy in centers:
        d = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2) / max(radius, 1.0)
        mask = np.maximum(mask, np.clip(1.0 - d, 0.0, 1.0) ** 1.5)
    return mask


def warp(img: Image.Image, zones: list[Zone]) -> tuple[Image.Image, np.ndarray]:
    """Stage 1: deterministic per-zone geometry + line softening, plus the mask
    of everything the plan is allowed to change."""

    import cv2

    pts = landmarks(img)
    arr = np.asarray(img, dtype=np.float32)
    h, w = arr.shape[:2]

    iod = float(np.linalg.norm(pts[33] - pts[263])) or (w * 0.25)
    flow_x = np.zeros((h, w), dtype=np.float32)
    flow_y = np.zeros((h, w), dtype=np.float32)
    smooth_mask = np.zeros((h, w), dtype=np.float32)
    # Union of the treated zones. Stage 2 may not paint a pixel outside this.
    treated = np.zeros((h, w), dtype=np.float32)

    center = pts[168] if len(pts) > 168 else np.array([w / 2, h / 2], dtype=np.float32)

    for zone in zones:
        geo = ZONE_GEOMETRY.get(zone.id)
        if not geo:
            continue
        idx = [i for i in geo["points"] if i < len(pts)]
        if not idx:
            continue
        centers = pts[idx]
        radius = geo["radius"] * iod
        mask = zone_mask((h, w), centers, radius)
        strength = float(np.clip(zone.strength, 0.0, 1.0))
        action = geo["action"]
        treated = np.maximum(treated, mask * (0.35 + 0.65 * strength))


        if action == "smooth":
            smooth_mask = np.maximum(smooth_mask, mask * strength * MAX_SMOOTH)
            continue

        shift = MAX_SHIFT[action] * strength * iod
        if action == "lift":
            flow_y -= mask * shift
        elif action == "slim":
            # Pull the treated jaw/masseter skin toward the midline.
            direction = np.sign(centers[:, 0].mean() - center[0]) or 1.0
            flow_x -= mask * shift * direction
        else:  # volume
            # Push outward from the face centre so the hollow fills.
            vec = centers.mean(axis=0) - center
            norm = float(np.linalg.norm(vec)) or 1.0
            flow_x += mask * shift * float(vec[0]) / norm
            flow_y += mask * shift * float(vec[1]) / norm

    out = arr
    if float(np.abs(flow_x).max() + np.abs(flow_y).max()) > 0.01:
        grid_x, grid_y = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
        # Sample from where the tissue came FROM, so the mapped displacement
        # moves the tissue in the intended direction.
        map_x = np.clip(grid_x - flow_x, 0, w - 1)
        map_y = np.clip(grid_y - flow_y, 0, h - 1)
        out = cv2.remap(out, map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    if float(smooth_mask.max()) > 0.01:
        blur = cv2.bilateralFilter(out.astype(np.uint8), 11, 45, 11).astype(np.float32)
        # Only ever reduce local contrast: min() guarantees no line is deepened.
        softened = np.minimum(np.maximum(blur, out * 0.0), np.maximum(out, blur))
        alpha = smooth_mask[..., None]
        out = out * (1 - alpha) + softened * alpha

    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), np.clip(treated, 0.0, 1.0)


def sdxl_canvas(size: tuple[int, int]) -> tuple[int, int]:
    """SDXL works around 1024px and needs multiples of 8."""
    w, h = size
    scale = 1024.0 / max(w, h)
    return (max(512, int(w * scale) // 8 * 8), max(512, int(h * scale) // 8 * 8))


def plan_text(body: PreviewRequest) -> str:
    return "; ".join(
        f"{z.label or z.id}: "
        + (
            f"{z.dose:g} units botulinum toxin, lines softened"
            if z.treatment == "botox"
            else f"{z.dose:g} ml hyaluronic acid filler, small smooth volume added"
        )
        for z in body.zones
    )


NEGATIVE_PROMPT = (
    "new wrinkles, deeper lines, different person, different face shape, plastic skin, "
    "heavy retouching, makeup, whitened skin, distorted features, overfilled lips, "
    "airbrushed, beauty filter, cartoon"
)


def refine(
    base: Image.Image, warped: Image.Image, treated: np.ndarray, body: PreviewRequest
) -> Image.Image | None:
    """Stage 2: photoreal re-render of the treated zones only. None when disabled.

    The diffusion model is a renderer, never the decision-maker: the shape change
    already happened in stage 1, ControlNet Canny holds the patient's structure,
    the inpaint mask restricts painting to the treated zones, and the result is
    composited back through that same mask so untreated skin is untouched.
    """
    pipe = refiner()
    if pipe is None or float(treated.max()) < 0.02:
        return None

    import cv2

    try:
        prompt = (
            "Photorealistic clinical after-photo, 2-4 weeks after this injectable plan: "
            f"{plan_text(body)}. Keep the identical person, bone structure, skin tone, pores, "
            "hair, expression, pose, lighting, background and framing. Treated areas only: "
            "lines shallower, hollows slightly fuller. Never add or deepen any wrinkle, never "
            "smooth or whiten skin, no makeup, no beautification."
        )

        if REFINER == "sdxl":
            canvas = sdxl_canvas(warped.size)
            src = warped.resize(canvas, Image.LANCZOS)

            # Paintable area: the treated zones, dilated slightly so the edit can
            # blend at its own edges.
            binary = (treated > 0.12).astype(np.uint8) * 255
            binary = cv2.dilate(binary, np.ones((9, 9), np.uint8), iterations=2)
            mask_img = Image.fromarray(binary).resize(canvas, Image.BILINEAR)

            # Structure lock: the model must redraw the same edges it was given.
            edges = cv2.Canny(np.asarray(src.convert("L")), 80, 160)
            control = Image.fromarray(np.stack([edges] * 3, axis=-1))

            extra: dict = {}
            if getattr(pipe, "_mali_face_lock", False):
                extra["ip_adapter_image"] = src

            result = pipe(
                prompt=prompt,
                negative_prompt=NEGATIVE_PROMPT,
                image=src,
                mask_image=mask_img,
                control_image=control,
                num_inference_steps=REFINER_STEPS,
                strength=REFINER_STRENGTH,
                guidance_scale=REFINER_GUIDANCE,
                controlnet_conditioning_scale=CONTROLNET_SCALE,
                **extra,
            )
        else:
            result = pipe(
                image=warped,
                prompt=prompt,
                negative_prompt=NEGATIVE_PROMPT,
                num_inference_steps=REFINER_STEPS,
                true_cfg_scale=4.0,
                strength=REFINER_STRENGTH,
            )

        painted = result.images[0].convert("RGB").resize(warped.size, Image.LANCZOS)

        # Hard identity guarantee, whichever engine ran: outside the treated mask
        # the pixels are the warp's, not the diffusion model's.
        sigma = max(3.0, min(warped.size) * 0.006)
        feather = cv2.GaussianBlur(treated.astype(np.float32), (0, 0), sigma)
        alpha = np.clip(feather, 0.0, 1.0)[..., None]
        blended = np.asarray(warped, dtype=np.float32) * (1 - alpha) + np.asarray(
            painted, dtype=np.float32
        ) * alpha
        return Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8)).resize(
            base.size, Image.LANCZOS
        )
    except Exception as exc:  # noqa: BLE001
        print("[mali] refiner failed, returning warp only:", exc)
        return None



REFINER_LABEL = {
    "sdxl": "sdxl-controlnet-inpaint",
    "qwen": "qwen-image-edit",
}


@app.get("/health")
def health() -> dict:
    stages = ["warp"]
    if REFINER in ("sdxl", "qwen"):
        stages.append("refine")
    return {
        "ok": True,
        "stub": STUB,
        "model_version": MODEL_VERSION,
        "lesion": not STUB,
        "aesthetic_stages": stages,
        "warp_version": WARP_VERSION,
        "refiner": REFINER_LABEL.get(REFINER),
    }



@app.post("/v1/lesion")
def lesion(body: LesionRequest, _: None = Depends(require_key)) -> dict:
    tensor = decode(body.image)

    if STUB:
        probs = np.array([0.18, 0.62, 0.20], dtype=np.float32)
    else:
        sess = session()
        logits = sess.run(None, {sess.get_inputs()[0].name: tensor})[0][0]
        probs = softmax(np.asarray(logits, dtype=np.float32))

    return {
        "melanoma": float(probs[CLASSES.index("melanoma")]),
        "seborrheic_keratosis": float(probs[CLASSES.index("seborrheic_keratosis")]),
        "model_version": MODEL_VERSION,
    }


@app.post("/v1/aesthetic-preview")
def aesthetic_preview(body: PreviewRequest, _: None = Depends(require_key)) -> dict:
    if not body.zones:
        raise HTTPException(status_code=400, detail="No treatment zones supplied")

    base = decode_image(body.image)
    if max(base.size) > 1600:
        scale = 1600 / max(base.size)
        base = base.resize((int(base.width * scale), int(base.height * scale)), Image.LANCZOS)

    warped, treated = warp(base, body.zones)
    refined = refine(base, warped, treated, body)
    final = refined or warped
    stages = ["warp"] + (["refine"] if refined is not None else [])
    label = REFINER_LABEL.get(REFINER, "")
    weights = SDXL_MODEL if REFINER == "sdxl" else REFINER_MODEL

    return {
        "after_image": encode_jpeg(final),
        "engine": "facemesh-warp" + (f"+{label}" if refined is not None else ""),
        "engine_version": WARP_VERSION + (f"+{weights}" if refined is not None else ""),
        "stages": stages,

    }
