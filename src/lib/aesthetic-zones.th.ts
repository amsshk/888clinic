/**
 * Thai wording for the injectable face map.
 *
 * The clinical spec (doses, anatomy, mask geometry) stays in
 * `aesthetic-zones.ts` — this file only carries the patient-facing Thai text
 * so the Thai site never falls back to English on the predict page.
 */
import type { DoseBand, FaceZone, Treatment } from "./aesthetic-zones";

type ZoneText = { label: string; effect: string; cannot: string };

const TH: Record<string, { base: ZoneText; alt?: ZoneText }> = {
  forehead: {
    base: {
      label: "ริ้วรอยหน้าผาก",
      effect: "ทำให้ริ้วรอยแนวขวางบนหน้าผากดูตื้นลง",
      cannot: "ยกหนังตาหรือคิ้วที่หย่อนไม่ได้ และไม่ได้แก้ผิวที่หย่อนคล้อยค่ะ",
    },
  },
  glabella: {
    base: {
      label: "รอยขมวดหว่างคิ้ว (11)",
      effect: "คลายกล้ามเนื้อ รอยขมวดแนวตั้งหว่างคิ้วดูตื้นลง",
      cannot: "รอยลึกที่เห็นตอนหน้านิ่งจะไม่หายหมดในครั้งเดียว และไม่ได้เปลี่ยนรูปตาค่ะ",
    },
    alt: {
      label: "รอยขมวดหว่างคิ้ว (11)",
      effect: "เติมพยุงรอยลึกที่ยังเห็นชัดตอนหน้านิ่ง",
      cannot: "ไม่ได้ทำให้เลิกขมวดคิ้ว และจุดนี้เสี่ยงสูง หมอมักเริ่มด้วยโบท็อกซ์ก่อนค่ะ",
    },
  },
  brow: {
    base: {
      label: "ยกหางคิ้ว",
      effect: "ยกหางคิ้วขึ้นเล็กน้อย ตาดูเปิดขึ้น",
      cannot: "หนังตาบนที่ตกคลุมแก้ไม่ได้ และยกได้แค่ 1–3 มม. เท่านั้นค่ะ",
    },
  },
  crows: {
    base: {
      label: "รอยตีนกา",
      effect: "ลดริ้วรอยเล็ก ๆ ที่หางตา",
      cannot: "ไม่ได้แก้รอยคล้ำใต้ตา ถุงใต้ตา หรือผิวใต้ตาที่บางย่นค่ะ",
    },
  },
  masseter: {
    base: {
      label: "เรียวกราม (กล้ามเนื้อแก้ม)",
      effect: "กรามดูเรียวลง หน้าเรียวเป็นวีขึ้น",
      cannot: "ลดกระดูกหรือไขมันใต้คางไม่ได้ และเห็นผลชัดหลังสัปดาห์ที่ 4 ขึ้นไปค่ะ",
    },
  },
  temples: {
    base: {
      label: "ขมับ",
      effect: "เติมขมับที่ตอบ กรอบหน้าช่วงบนดูเต็มขึ้น",
      cannot: "ไม่ได้เปลี่ยนโครงกระดูก และไม่ได้ยกกลางใบหน้าค่ะ",
    },
  },
  "tear-trough": {
    base: {
      label: "ใต้ตา (ร่องน้ำตา)",
      effect: "ลดเงาและร่องลึกใต้ตา",
      cannot: "ไม่ได้แก้รอยดำจากเม็ดสี ถุงไขมัน หรืออาการบวมน้ำ ถ้าเติมมากจะบวมและออกอมฟ้าค่ะ",
    },
  },
  cheeks: {
    base: {
      label: "โหนกแก้ม",
      effect: "เติมวอลลุ่มกลางหน้า แก้มดูอิ่มมีมิติ",
      cannot: "ไม่ได้ทำให้หน้าเรียว ไม่ได้เก็บแก้มห้อย และแทนการดึงหน้าไม่ได้ค่ะ",
    },
  },
  nasolabial: {
    base: {
      label: "ร่องแก้ม",
      effect: "ร่องจากข้างจมูกถึงมุมปากดูตื้นลง",
      cannot: "ร่องจะไม่หายหมด และถ้าเติมเยอะเกินริมฝีปากบนจะดูหนักค่ะ",
    },
  },
  lips: {
    base: {
      label: "ริมฝีปาก",
      effect: "อิ่มน้ำ ดูฉ่ำขึ้นแบบพอดี ยังคงรูปปากเดิม",
      cannot: "ไม่ได้เปลี่ยนรูปปากธรรมชาติ และถ้าเกิน 1 ml ครั้งเดียวจะเริ่มดูทำมาค่ะ",
    },
    alt: {
      label: "ริมฝีปาก",
      effect: "ลิปฟลิป — ปากบนพลิกขึ้นเล็กน้อยโดยไม่เพิ่มวอลลุ่ม",
      cannot: "ไม่ได้เพิ่มความอิ่มจริง อยู่ได้ 6–10 สัปดาห์ ถ้าเยอะเกินจะพูดและดื่มน้ำลำบากค่ะ",
    },
  },
  chin: {
    base: {
      label: "คาง",
      effect: "คางดูยาวขึ้น โปรไฟล์ด้านข้างสมดุลขึ้น",
      cannot: "ไม่ได้แก้ปัญหาการสบฟันหรือตำแหน่งขากรรไกร เรื่องนั้นต้องจัดฟันหรือผ่าตัดค่ะ",
    },
    alt: {
      label: "คาง",
      effect: "ลดคางย่นเป็นลูกคลื่นให้เรียบขึ้น",
      cannot: "ไม่ได้เพิ่มความยาวหรือความโปนของคาง อันนั้นต้องใช้ฟิลเลอร์ค่ะ",
    },
  },
  jawline: {
    base: {
      label: "กรอบหน้า/ขอบกราม",
      effect: "ขอบกรามดูคมและชัดขึ้น",
      cannot: "ไม่ได้เก็บเหนียงหรือหนังคอที่หย่อนค่ะ",
    },
  },
};

/** Patient-facing wording for a zone in the current language. */
export function zoneText(
  zone: FaceZone,
  treatment: Treatment,
  lang: "en" | "th",
): ZoneText {
  const spec = zone.alt && zone.alt.treatment === treatment ? zone.alt : zone;
  const fallback = { label: zone.label, effect: spec.effect, cannot: spec.cannot };
  if (lang !== "th") return fallback;
  const entry = TH[zone.id];
  if (!entry) return fallback;
  const th = zone.alt && zone.alt.treatment === treatment ? entry.alt ?? entry.base : entry.base;
  return th;
}

export const DOSE_BAND_LABEL_TH: Record<DoseBand, string> = {
  conservative: "น้อยกว่าช่วงที่ใช้กันทั่วไป — ผลจะเบามากค่ะ",
  typical: "อยู่ในช่วงที่หมอใช้กันทั่วไป",
  "above-typical": "มากกว่าช่วงที่ใช้กันทั่วไป — หมออาจแนะนำให้ลดลงค่ะ",
};

/** "12 ยูนิต" / "1 ml" */
export function doseLabelTh(treatment: Treatment, dose: number) {
  return treatment === "botox" ? `${dose} ยูนิต` : `${dose} ml`;
}

export function typicalRangeLabelTh(treatment: Treatment, typical: [number, number]) {
  return `${typical[0]}–${typical[1]} ${treatment === "botox" ? "ยูนิต" : "ml"}`;
}

export const TREATMENT_LABEL_TH: Record<Treatment, string> = {
  botox: "โบท็อกซ์",
  filler: "ฟิลเลอร์",
};
