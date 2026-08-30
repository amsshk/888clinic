export type Treatment = "botox" | "filler";

/** Everything that depends on WHICH product is injected into an area. */
export type ZoneSpec = {
  treatment: Treatment;
  /** default dose: units for botox, ml for filler */
  defaultDose: number;
  min: number;
  max: number;
  step: number;
  /** clinically typical dosing window used by injectors [low, high] */
  typical: [number, number];
  effect: string;
  /**
   * What the dose physically does, written for the simulation engine.
   * Keeps the render anatomically honest instead of "prettier".
   */
  anatomy: string;
  /** what this dose can NOT do, so the render never over-promises */
  cannot: string;
};

export type FaceZone = ZoneSpec & {
  id: string;
  label: string;
  /** normalized 0-100 coords on the face map */
  x: number;
  y: number;
  rx: number;
  ry: number;
  /**
   * Some areas are genuinely treatable with either product (a deep static
   * frown line can be relaxed with toxin or supported with filler, lips can
   * be volumised with filler or flipped with toxin). When present, the
   * patient chooses which one they want and the dosing follows that choice.
   */
  alt?: ZoneSpec;
};

/** The dosing/anatomy spec for a zone given the product the patient chose. */
export function zoneSpec(zone: FaceZone, treatment: Treatment): ZoneSpec {
  if (zone.alt && zone.alt.treatment === treatment) return zone.alt;
  return zone;
}

/** Products that can be used in this area. */
export function zoneTreatments(zone: FaceZone): Treatment[] {
  return zone.alt ? [zone.treatment, zone.alt.treatment] : [zone.treatment];
}


export const FACE_ZONES: FaceZone[] = [
  {
    id: "forehead",
    label: "Forehead lines",
    treatment: "botox",
    x: 50,
    y: 20,
    rx: 20,
    ry: 7,
    defaultDose: 12,
    min: 4,
    max: 24,
    step: 2,
    typical: [8, 16],
    effect: "Softens horizontal forehead lines",
    anatomy:
      "Relaxes the frontalis muscle, so horizontal forehead lines flatten at rest; deep etched-in lines remain faintly visible as static creases.",
    cannot:
      "Cannot lift heavy brows, cannot remove skin laxity, and does not change forehead height or hairline.",
  },
  {
    id: "glabella",
    label: "Frown lines (glabella)",
    treatment: "botox",
    x: 50,
    y: 32,
    rx: 7,
    ry: 5,
    defaultDose: 20,
    min: 8,
    max: 30,
    step: 2,
    typical: [16, 24],
    effect: "Relaxes the vertical '11' lines between the brows",
    anatomy:
      "Relaxes corrugator and procerus muscles: the vertical '11' lines soften and the medial brow sits a millimetre or two higher, giving a less tense expression.",
    cannot: "Cannot erase a deep static groove in one session and does not change eye shape.",
    alt: {
      treatment: "filler",
      defaultDose: 0.5,
      min: 0.2,
      max: 1,
      step: 0.1,
      typical: [0.2, 0.5],
      effect: "Supports a deep static frown line that stays visible at rest",
      anatomy:
        "A very small amount of soft hyaluronic acid placed superficially lifts the floor of the etched-in vertical line so it casts less shadow; the muscle still moves.",
      cannot:
        "Cannot stop frowning, and this is a high-risk area — an injector may prefer toxin first and filler only afterwards, if at all.",
    },
  },
  {
    id: "brow",
    label: "Brow lift",
    treatment: "botox",
    x: 30,
    y: 30,
    rx: 8,
    ry: 4,
    defaultDose: 6,
    min: 2,
    max: 12,
    step: 2,
    typical: [4, 8],
    effect: "Lifts the outer brow tail for a more open eye",
    anatomy:
      "Weakens the lateral orbicularis so the brow tail rises about 1-3 mm — a subtle opening of the upper eyelid area, not a surgical brow lift.",
    cannot: "Cannot remove hooded upper-lid skin or raise the brow more than a few millimetres.",
  },
  {
    id: "crows",
    label: "Crow's feet",
    treatment: "botox",
    x: 74,
    y: 40,
    rx: 8,
    ry: 5,
    defaultDose: 10,
    min: 4,
    max: 20,
    step: 2,
    typical: [8, 14],
    effect: "Smooths fine lines at the outer eye corners",
    anatomy:
      "Softens the fan of fine lines at the outer eye corners at rest; skin texture and under-eye hollowing are unchanged.",
    cannot: "Cannot brighten dark circles, remove under-eye bags, or tighten crepey skin.",
  },
  {
    id: "masseter",
    label: "Jaw slimming (masseter)",
    treatment: "botox",
    x: 22,
    y: 66,
    rx: 8,
    ry: 8,
    defaultDose: 25,
    min: 10,
    max: 40,
    step: 5,
    typical: [20, 30],
    effect: "Slims a square jaw, softer lower-face taper",
    anatomy:
      "Gradually reduces masseter bulk over 6-8 weeks, narrowing the widest part of the lower face by a few millimetres per side for a softer taper.",
    cannot:
      "Cannot reduce bone width or submental fat, and shows almost nothing before week four.",
  },
  {
    id: "temples",
    label: "Temples",
    treatment: "filler",
    x: 76,
    y: 27,
    rx: 8,
    ry: 6,
    defaultDose: 1,
    min: 0.5,
    max: 2,
    step: 0.5,
    typical: [1, 2],
    effect: "Restores hollow temples, smoother upper-face contour",
    anatomy:
      "Replaces lost temporal volume so the hollow beside the brow becomes flatter and the upper-face outline reads smoother; 1 ml per side is a mild correction.",
    cannot: "Cannot change skull shape or lift the mid-face.",
  },
  {
    id: "tear-trough",
    label: "Under-eye (tear trough)",
    treatment: "filler",
    x: 36,
    y: 44,
    rx: 8,
    ry: 4,
    defaultDose: 0.5,
    min: 0.5,
    max: 1,
    step: 0.5,
    typical: [0.5, 1],
    effect: "Reduces under-eye shadow and hollowing",
    anatomy:
      "Fills the hollow groove under the eye so the shadow it casts becomes lighter; a conservative area where 0.5-1 ml total is the norm.",
    cannot:
      "Cannot treat pigmentation, fat-pad bags, or fluid puffiness — overfilling here causes swelling and a bluish tinge.",
  },
  {
    id: "cheeks",
    label: "Cheekbones",
    treatment: "filler",
    x: 72,
    y: 52,
    rx: 9,
    ry: 6,
    defaultDose: 1,
    min: 0.5,
    max: 2,
    step: 0.5,
    typical: [1, 2],
    effect: "Adds lifted mid-face volume and definition",
    anatomy:
      "Adds projection over the cheekbone, giving a slightly higher light reflection and mild lift of the mid-face; 1 ml per side is a natural, restrained change.",
    cannot: "Cannot slim the face, remove jowls, or replace a facelift.",
  },
  {
    id: "nasolabial",
    label: "Nasolabial folds",
    treatment: "filler",
    x: 40,
    y: 60,
    rx: 5,
    ry: 6,
    defaultDose: 1,
    min: 0.5,
    max: 2,
    step: 0.5,
    typical: [0.5, 1.5],
    effect: "Softens the smile lines from nose to mouth",
    anatomy:
      "Supports the crease from nose to mouth corner so it looks shallower, usually a partial softening rather than full erasure.",
    cannot: "Cannot remove the fold completely, and over-treatment creates a heavy upper lip area.",
  },
  {
    id: "lips",
    label: "Lips",
    treatment: "filler",
    x: 50,
    y: 70,
    rx: 10,
    ry: 4,
    defaultDose: 1,
    min: 0.5,
    max: 2,
    step: 0.5,
    typical: [0.5, 1],
    effect: "Balanced hydration and gentle volume, keeps natural shape",
    anatomy:
      "0.5 ml gives definition and hydration with barely visible added size; 1 ml gives a modest, still-natural increase in height and a slightly crisper border.",
    cannot:
      "Cannot change the natural lip shape or philtrum, and above 1 ml in one session the result starts to look done.",
    alt: {
      treatment: "botox",
      defaultDose: 4,
      min: 2,
      max: 6,
      step: 1,
      typical: [2, 4],
      effect: "Lip flip — the upper lip rolls out slightly without added volume",
      anatomy:
        "Relaxes the orbicularis oris at the upper lip border so the lip everts a millimetre or two, showing slightly more pink lip; total volume is unchanged.",
      cannot:
        "Cannot add real volume or fix asymmetry, lasts only 6-10 weeks, and too much affects speech and drinking.",
    },
  },
  {
    id: "chin",
    label: "Chin",
    treatment: "filler",
    x: 50,
    y: 84,
    rx: 8,
    ry: 5,
    defaultDose: 1,
    min: 0.5,
    max: 2,
    step: 0.5,
    typical: [1, 2],
    effect: "Improves profile balance and chin projection",
    anatomy:
      "Projects and lengthens the chin by a few millimetres, balancing the profile against the nose and lips.",
    cannot: "Cannot correct a jaw-position or bite problem — that is orthodontic or surgical.",
    alt: {
      treatment: "botox",
      defaultDose: 6,
      min: 2,
      max: 10,
      step: 2,
      typical: [4, 8],
      effect: "Smooths a dimpled, orange-peel chin",
      anatomy:
        "Relaxes the mentalis so the puckered dimpling on the chin flattens and the chin surface reads smoother; projection is unchanged.",
      cannot: "Cannot add chin projection or lengthen the chin — that needs filler.",
    },
  },
  {
    id: "jawline",
    label: "Jawline",
    treatment: "filler",
    x: 70,
    y: 76,
    rx: 9,
    ry: 5,
    defaultDose: 1.5,
    min: 0.5,
    max: 2,
    step: 0.5,
    typical: [1, 2],
    effect: "Sharper, more defined jaw contour",
    anatomy:
      "Defines the jaw angle and border so the contour line reads sharper; per side, 1-2 ml is a definition change, not a reshaping.",
    cannot: "Cannot remove a double chin or loose neck skin.",
  },
];

export function doseLabel(spec: Pick<ZoneSpec, "treatment">, dose: number) {
  return spec.treatment === "botox" ? `${dose} units` : `${dose} ml`;
}

export type DoseBand = "conservative" | "typical" | "above-typical";

/** Where the chosen dose sits against the clinically typical window. */
export function doseBand(spec: Pick<ZoneSpec, "typical">, dose: number): DoseBand {
  if (dose < spec.typical[0]) return "conservative";
  if (dose > spec.typical[1]) return "above-typical";
  return "typical";
}

export const DOSE_BAND_LABEL: Record<DoseBand, string> = {
  conservative: "Below the usual range — expect a very light change",
  typical: "Within the usual clinical range",
  "above-typical": "Above the usual range — an injector may advise less",
};

/** Typical-window text used in both the UI and the simulation prompt. */
export function typicalRangeLabel(spec: Pick<ZoneSpec, "treatment" | "typical">) {
  const unit = spec.treatment === "botox" ? "units" : "ml";
  return `${spec.typical[0]}–${spec.typical[1]} ${unit}`;
}


/**
 * Fraction of the zone's maximum realistic effect that this dose delivers.
 * Sub-linear on purpose: doubling filler does not double the visible change.
 */
export function effectStrength(spec: Pick<ZoneSpec, "min" | "max">, dose: number) {
  const span = Math.max(spec.max - spec.min, 0.0001);
  const raw = (dose - spec.min) / span;

  return Math.round((0.35 + 0.65 * Math.pow(Math.max(raw, 0), 0.7)) * 100);
}


/**
 * Editable-region geometry used to build the OpenAI edit mask.
 *
 * These are fractions of the PATIENT PHOTO (not the face map), so the same
 * table works for any upload size. Bilateral areas list both sides — the face
 * map only carries one marker per pair because it is a tap target, whereas the
 * mask has to protect/expose both cheeks, both temples, both eyes.
 *
 * Deliberately generous: a mask that is slightly too big still protects the
 * hair, background, eyes and clothing, while a mask that is too tight leaves a
 * visible seam. Replace with landmark-driven shapes once the face mesh emits
 * per-zone polygons.
 */
export type MaskEllipse = { cx: number; cy: number; rx: number; ry: number; rot?: number };

export const ZONE_MASK_SHAPES: Record<string, MaskEllipse[]> = {
  forehead: [{ cx: 0.5, cy: 0.29, rx: 0.22, ry: 0.08 }],
  glabella: [{ cx: 0.5, cy: 0.42, rx: 0.07, ry: 0.05 }],
  brow: [
    { cx: 0.31, cy: 0.41, rx: 0.09, ry: 0.035, rot: -0.2 },
    { cx: 0.69, cy: 0.41, rx: 0.09, ry: 0.035, rot: 0.2 },
  ],
  crows: [
    { cx: 0.29, cy: 0.47, rx: 0.07, ry: 0.05 },
    { cx: 0.71, cy: 0.47, rx: 0.07, ry: 0.05 },
  ],
  masseter: [
    { cx: 0.24, cy: 0.68, rx: 0.08, ry: 0.09, rot: -0.3 },
    { cx: 0.76, cy: 0.68, rx: 0.08, ry: 0.09, rot: 0.3 },
  ],
  temples: [
    { cx: 0.22, cy: 0.38, rx: 0.07, ry: 0.08 },
    { cx: 0.78, cy: 0.38, rx: 0.07, ry: 0.08 },
  ],
  "tear-trough": [
    { cx: 0.37, cy: 0.5, rx: 0.08, ry: 0.04 },
    { cx: 0.63, cy: 0.5, rx: 0.08, ry: 0.04 },
  ],
  cheeks: [
    { cx: 0.34, cy: 0.55, rx: 0.11, ry: 0.06, rot: -0.25 },
    { cx: 0.66, cy: 0.55, rx: 0.11, ry: 0.06, rot: 0.25 },
  ],
  nasolabial: [
    { cx: 0.41, cy: 0.62, rx: 0.05, ry: 0.06, rot: -0.2 },
    { cx: 0.59, cy: 0.62, rx: 0.05, ry: 0.06, rot: 0.2 },
  ],
  lips: [{ cx: 0.5, cy: 0.68, rx: 0.13, ry: 0.05 }],
  chin: [{ cx: 0.5, cy: 0.79, rx: 0.12, ry: 0.07 }],
  jawline: [
    { cx: 0.35, cy: 0.74, rx: 0.08, ry: 0.09, rot: -0.5 },
    { cx: 0.65, cy: 0.74, rx: 0.08, ry: 0.09, rot: 0.5 },
  ],
};

/** Every editable ellipse for the selected zone ids, de-duplicated by zone. */
export function maskShapesForZones(zoneIds: string[]): MaskEllipse[] {
  const seen = new Set<string>();
  const shapes: MaskEllipse[] = [];
  for (const id of zoneIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    for (const shape of ZONE_MASK_SHAPES[id] ?? []) shapes.push(shape);
  }
  return shapes;
}
