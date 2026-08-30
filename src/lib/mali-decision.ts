/**
 * MALI is the primary reader.
 *
 * The lesion classifier from `ml/mali` returns three probabilities. This module
 * turns them into the clinical fields the report is built from, so the decision
 * comes from our own model and the language model only writes the wording.
 */

export type MaliProbs = {
  melanoma: number;
  nevus: number;
  seborrheicKeratosis: number;
};

export type MaliVerdict = {
  condition: string;
  confidence: number;
  severity: "mild" | "moderate" | "severe" | "unclear";
  urgency: "routine" | "soon" | "urgent";
  topClass: "melanoma" | "nevus" | "seborrheic_keratosis";
  briefing: string;
};

const clamp01 = (value: unknown) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
};

export function normalizeProbs(input: Partial<MaliProbs>): MaliProbs {
  const melanoma = clamp01(input.melanoma);
  const seborrheicKeratosis = clamp01(input.seborrheicKeratosis);
  const nevus = clamp01(input.nevus ?? Math.max(0, 1 - melanoma - seborrheicKeratosis));
  const total = melanoma + nevus + seborrheicKeratosis;
  if (total <= 0) return { melanoma: 0, nevus: 1, seborrheicKeratosis: 0 };
  return {
    melanoma: melanoma / total,
    nevus: nevus / total,
    seborrheicKeratosis: seborrheicKeratosis / total,
  };
}

export function maliVerdict(probs: MaliProbs): MaliVerdict {
  const entries = [
    { key: "melanoma" as const, label: "Suspicious melanocytic lesion (possible melanoma)", p: probs.melanoma },
    { key: "nevus" as const, label: "Benign-appearing melanocytic naevus", p: probs.nevus },
    {
      key: "seborrheic_keratosis" as const,
      label: "Seborrhoeic keratosis (benign keratinocytic lesion)",
      p: probs.seborrheicKeratosis,
    },
  ].sort((a, b) => b.p - a.p);

  const top = entries[0]!;
  const melanoma = probs.melanoma;

  const urgency: MaliVerdict["urgency"] = melanoma >= 0.7 ? "urgent" : melanoma >= 0.4 ? "soon" : "routine";
  const severity: MaliVerdict["severity"] =
    melanoma >= 0.7 ? "severe" : melanoma >= 0.4 ? "moderate" : top.p < 0.5 ? "unclear" : "mild";

  return {
    condition: top.label,
    confidence: Number(top.p.toFixed(3)),
    severity,
    urgency,
    topClass: top.key,
    briefing: [
      `MALI lesion classifier output — melanoma ${(probs.melanoma * 100).toFixed(1)}%,`,
      `naevus ${(probs.nevus * 100).toFixed(1)}%,`,
      `seborrhoeic keratosis ${(probs.seborrheicKeratosis * 100).toFixed(1)}%.`,
      `Leading class: ${top.key}. Referral urgency: ${urgency}.`,
    ].join(" "),
  };
}

/** Urgency can only be raised by MALI, never lowered. */
const URGENCY_RANK: Record<string, number> = { routine: 0, soon: 1, urgent: 2 };

export function escalateUrgency(current: string, melanomaProb: number): string {
  const suggested = melanomaProb >= 0.7 ? "urgent" : melanomaProb >= 0.4 ? "soon" : "routine";
  const now = URGENCY_RANK[current] ?? 0;
  const next = URGENCY_RANK[suggested] ?? 0;
  return next > now ? suggested : current;
}
