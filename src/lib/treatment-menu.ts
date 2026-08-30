/**
 * 888clinic — Aesthetic & Wellness price catalogue (display only, no checkout).
 * Mirrors the printed 2026 catalogue. Update here when the price board changes.
 */

export type PriceUnit = "cc" | "session" | "units100" | "shot" | "flat";

export type MenuItem = {
  nameEn: string;
  nameTh: string;
  descEn?: string;
  descTh?: string;
  /** Bullet lines (Thai) for richer entries such as the hair transplant program. */
  bulletsTh?: string[];
  bulletsEn?: string[];
  tag?: string;
  priceThb: number;
  unit: PriceUnit;
};

export type MenuGroup = {
  id: string;
  no: string;
  titleEn: string;
  titleTh: string;
  noteEn?: string;
  noteTh?: string;
  footnoteEn?: string;
  footnoteTh?: string;
  /** Two-column compact grid (used for laser hair removal areas). */
  compact?: boolean;
  /** Optional sub-heading blocks inside a group. */
  sections?: { titleEn: string; titleTh: string; items: MenuItem[] }[];
  items: MenuItem[];
};

export const TREATMENT_MENU: MenuGroup[] = [
  {
    id: "filler",
    no: "01",
    titleEn: "Filler Program",
    titleTh: "กลุ่มฟิลเลอร์เติมเต็ม, ปรับรูปหน้า",
    items: [
      {
        nameEn: "Neuramis Deep Cross-Linked",
        nameTh: "Neuramis Deep Cross-Linked",
        descTh:
          "เหมาะกับการเติมร่องลึกบริเวณร่องแก้ม ร่องใต้ตา ปาก คาง หน้าผาก อยู่ได้นาน 6-8 เดือน",
        descEn:
          "Deep folds — nasolabial folds, tear troughs, lips, chin, forehead. Lasts 6–8 months.",
        priceThb: 9999,
        unit: "cc",
      },
      {
        nameEn: "Neuramis Deep Lidocaine",
        nameTh: "Neuramis Deep Lidocaine",
        descTh:
          "เหมาะกับการเติมร่องลึกระดับกลาง ร่องแก้ม ร่องใต้ตา ปาก คาง หน้าผาก ใช้นาน 6-8 เดือน",
        descEn:
          "Mid-depth folds with lidocaine for comfort — folds, tear troughs, lips, chin, forehead. Lasts 6–8 months.",
        priceThb: 9999,
        unit: "cc",
      },
      {
        nameEn: "Neuramis Volume",
        nameTh: "Neuramis Volume",
        descTh:
          "เหมาะกับการยกกระชับผิวหน้า คาง สันกราม กรอบหน้า โหนกแก้ม เติมร่อง อยู่ได้นาน 12-24 เดือน",
        descEn:
          "Lifting and volume — chin, jawline, facial frame, cheekbones. Lasts 12–24 months.",
        priceThb: 11999,
        unit: "cc",
      },
      {
        nameEn: "Restylane Skin Booster Vital Light",
        nameTh: "Restylane Skin booster Vital light",
        descTh:
          "เหมาะกับการปรับผิวหน้า ให้ขาวใส ลดรอยดำ หมอง หน้าผาก ฟื้นฟูผิว อยู่ได้นาน 6-12 เดือน",
        descEn:
          "Skin quality, hydration and brightness, dull skin recovery. Lasts 6–12 months.",
        priceThb: 25000,
        unit: "cc",
      },
      {
        nameEn: "Restylane Perlane Lyft",
        nameTh: "Restylane Perlane Lyft",
        descTh:
          "เหมาะกับการฉีดขมับ เติมเต็ม แก้ม ตา ลดริ้วรอยรอบหน้า ยกกระชับ ปรับรูปหน้า เหนียง อยู่ได้นาน 12 เดือน",
        descEn:
          "Temples, cheeks, eye area, lines, lifting and contour. Lasts about 12 months.",
        priceThb: 25000,
        unit: "cc",
      },
      {
        nameEn: "Juvederm Volbella",
        nameTh: "Juvederm Volbella",
        descTh: "เหมาะกับการเติมหน้าผาก อยู่ได้นาน 12 เดือน",
        descEn: "Forehead filling and fine detail. Lasts about 12 months.",
        priceThb: 25000,
        unit: "cc",
      },
      {
        nameEn: "Juvederm Voluma 2",
        nameTh: "Juvederm Voluma 2",
        descTh: "เหมาะกับการเติมบริเวณโหนกแก้ม ร่องแก้ม คาง อยู่ได้นาน 18 เดือน",
        descEn: "Cheekbones, nasolabial folds and chin. Lasts about 18 months.",
        priceThb: 25000,
        unit: "cc",
      },
    ],
  },
  {
    id: "botox",
    no: "02",
    titleEn: "Botox Program",
    titleTh: "กลุ่มโบท็อกซ์ปรับรูปหน้า",
    footnoteTh: "ลดริ้วรอย, ลิฟกรอบหน้า ปรับรูปหน้าเรียว • อยู่ได้นาน 4-6 เดือน",
    footnoteEn: "Line softening, jawline lift and slimmer contour • lasts 4–6 months",
    items: [
      { nameEn: "Botox Hugel — 100 units", nameTh: "Botox Hugel 100 ยูนิต", priceThb: 12900, unit: "units100" },
      { nameEn: "Botox Nabota — 100 units", nameTh: "Botox Nabota 100 ยูนิต", priceThb: 15900, unit: "units100" },
      {
        nameEn: "Botox Allergan — 100 units",
        nameTh: "Botox Allergan 100 ยูนิต",
        tag: "PREMIUM",
        priceThb: 25000,
        unit: "units100",
      },
    ],
  },
  {
    id: "thread",
    no: "03",
    titleEn: "Thread Lift",
    titleTh: "กลุ่มร้อยไหมปรับรูปหน้า",
    items: [
      {
        nameEn: "Cog thread — unlimited lines",
        nameTh: "ร้อยไหมไม่จำกัดเส้น Cog ธรรมดา",
        priceThb: 9999,
        unit: "flat",
      },
      { nameEn: "Minerva Premium", nameTh: "Minerva พรีเมี่ยม", priceThb: 19999, unit: "flat" },
      {
        nameEn: "Collagen thread — 20 lines",
        nameTh: "ร้อยไหมคอลลาเจน 20 เส้น",
        priceThb: 5999,
        unit: "flat",
      },
    ],
  },
  {
    id: "vitamin",
    no: "04",
    titleEn: "Skin Vitamin Drip",
    titleTh: "กลุ่มวิตามินผิว",
    items: [
      {
        nameEn: "Aura Bright",
        nameTh: "สูตร Aura Bright",
        tag: "BRIGHT & HYDRATE",
        descTh: "บำรุงผิวใส ชุ่มชื้น ผิวพรรณกระจ่างใส",
        descEn: "Hydration and an even, luminous tone.",
        priceThb: 999,
        unit: "session",
      },
      {
        nameEn: "Super Aura",
        nameTh: "สูตร Super Aura",
        tag: "PINKISH GLOW + IMMUNE",
        descTh: "ผิวกระจ่างใส กระชับใสอมชมพู เสริมภูมิคุ้มกัน ลดอาการภูมิแพ้",
        descEn: "Pinkish glow, firmer skin, immune support.",
        priceThb: 1499,
        unit: "session",
      },
      {
        nameEn: "Blink & White",
        nameTh: "สูตร Blink & White",
        tag: "EVEN TONE",
        descTh: "ปรับสีผิวให้ดูสม่ำเสมอ บำรุงผิวกระจ่างใส ชะลอการอักเสบ ลดจุดด่างดำ",
        descEn: "Evens tone, calms inflammation, reduces dark spots.",
        priceThb: 1999,
        unit: "session",
      },
      {
        nameEn: "Angel Premium",
        nameTh: "สูตร Angel Premium",
        tag: "RAPID RECOVERY",
        descTh: "ฟื้นฟูผิวคล้ำเสียเร่งด่วนให้กระจ่างใส มีออร่าขาวใสแบบมีสุขภาพดี",
        descEn: "Fast recovery for dull, sun-stressed skin.",
        priceThb: 2999,
        unit: "session",
      },
      {
        nameEn: "Express brightening formula",
        nameTh: "สูตรผิวขาวฉับเร่งด่วน",
        tag: "INTENSE AURA • COLLAGEN BOOST",
        descTh: "ผิวขาวใสมีออร่า สูตรเข้มข้นพิเศษ เน้นบำรุงให้ผิวกระจ่างใส เพิ่มคอลลาเจนผิว",
        descEn: "Concentrated brightening with a collagen boost.",
        priceThb: 3500,
        unit: "session",
      },
    ],
  },
  {
    id: "hair",
    no: "05",
    titleEn: "Hair Program",
    titleTh: "โปรแกรมปลูกผม",
    items: [
      {
        nameEn: "Hair PRP",
        nameTh: "Hair PRP",
        descTh: "ดูแลปัญหาผมร่วง ผมบาง ศีรษะล้าน",
        descEn: "For hair loss, thinning hair and bald patches.",
        priceThb: 3999,
        unit: "session",
      },
      {
        nameEn: "Hair transplant — The One' Clinic",
        nameTh: "ปลูกผม The One' Clinic",
        tag: "PERMANENT",
        bulletsTh: [
          "เทคนิคปลูกผมถาวร ปลูกด้วยแพทย์",
          "ไม่ต้องพักฟื้น เจ็บน้อย บวมน้อยมาก",
          "ผมหนาแน่น การเจริญเติบโตน่าพึงพอใจ",
          "มีผลงานการันตี ผมขึ้นใหม่เยอะ ทุกเคสผ่านการคัดกรอง",
        ],
        bulletsEn: [
          "Permanent technique, performed by a doctor",
          "No downtime, minimal pain and swelling",
          "Dense, satisfying regrowth",
          "Proven results; every case screened first",
        ],
        priceThb: 89000,
        unit: "session",
      },
    ],
  },
  {
    id: "lifting",
    no: "06",
    titleEn: "Lifting & Contour",
    titleTh: "สลายไขมัน, ผิวหน้ากระชับ",
    items: [
      {
        nameEn: "Mini Ulthera — full face, unlimited shots",
        nameTh: "Mini Ulthera ทั่วหน้าไม่จำกัดช็อต",
        priceThb: 12999,
        unit: "session",
      },
      { nameEn: "RF fat-reduction massage", nameTh: "RF นวดสลายไขมัน", priceThb: 1999, unit: "session" },
    ],
  },
  {
    id: "ipl",
    no: "07",
    titleEn: "Laser Hair Removal — IPL",
    titleTh: "เลเซอร์กำจัดขน",
    compact: true,
    footnoteTh: "* คิดต่อครั้ง สอบถามรายละเอียดที่คลินิก",
    footnoteEn: "* per session — details at the clinic",

    items: [
      { nameEn: "Underarms", nameTh: "รักแร้", priceThb: 800, unit: "session" },
      { nameEn: "Shins", nameTh: "ขาแข้ง", priceThb: 1500, unit: "session" },
      { nameEn: "Lower legs", nameTh: "ขาล่าง", priceThb: 1500, unit: "session" },
      { nameEn: "Lower arms", nameTh: "แขนล่าง", priceThb: 1200, unit: "session" },
      { nameEn: "Upper arms", nameTh: "แขนบน", priceThb: 1200, unit: "session" },
      { nameEn: "Bikini", nameTh: "บิกินี่", priceThb: 1000, unit: "session" },
      { nameEn: "Brazilian", nameTh: "บราซิเลี่ยน", priceThb: 1200, unit: "session" },
      { nameEn: "Moustache", nameTh: "หนวด", priceThb: 500, unit: "session" },
      { nameEn: "Back", nameTh: "แผ่นหลัง", priceThb: 1200, unit: "session" },
      { nameEn: "Beard", nameTh: "เครา", priceThb: 800, unit: "session" },
      { nameEn: "Moustache + beard", nameTh: "หนวด+เครา", priceThb: 2000, unit: "session" },
      { nameEn: "Full arms (upper + lower)", nameTh: "แขนบน+ล่างทั้งแขน", priceThb: 2600, unit: "session" },
      { nameEn: "Full legs (upper + lower)", nameTh: "ขาบน+ล่าง", priceThb: 2600, unit: "session" },
      {
        nameEn: "Full body",
        nameTh: "ทั้งตัว",
        tag: "COMPLETE TREATMENT",
        priceThb: 8000,
        unit: "session",
      },
    ],
  },
  {
    id: "treatment",
    no: "08",
    titleEn: "Treatment • Meso",
    titleTh: "ทรีทเมนท์ เมโส",
    items: [],
    sections: [
      {
        titleEn: "Treatment program",
        titleTh: "โปรแกรมทรีทเมนท์",
        items: [
          { nameEn: "Cryo", nameTh: "Cryo", priceThb: 1299, unit: "session" },
          { nameEn: "Gold mask", nameTh: "Mask ทองคำ", priceThb: 999, unit: "session" },
          { nameEn: "Aloe vera mask", nameTh: "Mask Alovera", priceThb: 999, unit: "session" },
        ],
      },
      {
        titleEn: "Meso program",
        titleTh: "โปรแกรมเมโส",
        items: [
          { nameEn: "Meso clear skin", nameTh: "Meso หน้าใส ละอาย", priceThb: 999, unit: "session" },
          { nameEn: "Meso clear skin LHA", nameTh: "Meso หน้าใส LHA", priceThb: 999, unit: "session" },
          { nameEn: "Meso Chanel (face)", nameTh: "Meso Chanel หน้า", priceThb: 3999, unit: "session" },
          { nameEn: "Meso for melasma", nameTh: "Meso ฝ้า", priceThb: 1599, unit: "session" },
          { nameEn: "Meso Fat", nameTh: "Meso Fat", priceThb: 3500, unit: "shot" },
          { nameEn: "Meso Hair", nameTh: "Meso Hair", priceThb: 1999, unit: "session" },
        ],
      },
    ],
  },
];
