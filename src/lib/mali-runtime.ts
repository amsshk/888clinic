/**
 * Runs the MALI lesion classifier (the ONNX export from `ml/mali`) in the
 * browser with onnxruntime-web, so no separate GPU host is required.
 *
 * The weights are uploaded by an admin to the private `models` bucket and
 * fetched through a short-lived signed URL.
 */

import { normalizeProbs, type MaliProbs } from "@/lib/mali-decision";

const IMG = 224;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const CLASSES = ["melanoma", "nevus", "seborrheic_keratosis"] as const;

type Session = {
  run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array }>>;
  inputNames: string[];
  outputNames: string[];
};

let cache: { url: string; session: Session } | null = null;

async function getSession(url: string): Promise<Session> {
  if (cache?.url === url) return cache.session;
  const ort = await import("onnxruntime-web");
  ort.env.wasm.numThreads = 1;
  const session = (await ort.InferenceSession.create(url, {
    executionProviders: ["wasm"],
  })) as unknown as Session;
  cache = { url, session };
  return session;
}

/** Centre-crop to a square, resize to 224, normalise to NCHW float tensor data. */
async function preprocess(file: File | Blob): Promise<Float32Array> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = IMG;
  canvas.height = IMG;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    IMG,
    IMG,
  );
  bitmap.close?.();

  const { data } = ctx.getImageData(0, 0, IMG, IMG);
  const out = new Float32Array(3 * IMG * IMG);
  const plane = IMG * IMG;
  for (let i = 0; i < plane; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      out[c * plane + i] = (data[i * 4 + c]! / 255 - MEAN[c]!) / STD[c]!;
    }
  }
  return out;
}

function softmax(logits: Float32Array | number[]) {
  const arr = Array.from(logits);
  const max = Math.max(...arr);
  const exp = arr.map((v) => Math.exp(v - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map((v) => v / sum);
}

export async function classifyLesion(file: File | Blob, modelUrl: string): Promise<MaliProbs> {
  const ort = await import("onnxruntime-web");
  const session = await getSession(modelUrl);
  const tensorData = await preprocess(file);
  const tensor = new ort.Tensor("float32", tensorData, [1, 3, IMG, IMG]);
  const inputName = session.inputNames[0] ?? "input";
  const output = await session.run({ [inputName]: tensor });
  const first = session.outputNames[0] ?? Object.keys(output)[0]!;
  const raw = output[first]?.data;
  if (!raw) throw new Error("Model returned no output");

  const values = Array.from(raw).slice(0, 3);
  const looksLikeProbs =
    values.every((v) => v >= 0 && v <= 1) && Math.abs(values.reduce((a, b) => a + b, 0) - 1) < 0.05;
  const probs = looksLikeProbs ? values : softmax(values);

  return normalizeProbs({
    melanoma: Number(probs[CLASSES.indexOf("melanoma")] ?? 0),
    nevus: Number(probs[CLASSES.indexOf("nevus")] ?? 0),
    seborrheicKeratosis: Number(probs[CLASSES.indexOf("seborrheic_keratosis")] ?? 0),
  });
}
