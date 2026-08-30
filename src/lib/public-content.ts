import type { BeforeAfterItem, ResultCategory } from "@/lib/before-after";
import type { CatalogItem } from "@/lib/catalog.shared";
import type { Lang } from "@/lib/i18n";

const PRODUCT_TH: Record<string, { name: string; note: string; actives?: string[] }> = {
  gentle_gel_cleanser: { name: "เจลล้างหน้าสูตรอ่อนโยน", note: "ล้างผิวทุกวันโดยไม่ทำให้ผิวแห้งตึง เหมาะกับผิวแพ้ง่ายและผิวเป็นสิวง่าย", actives: ["กลีเซอรีน", "แพนทีนอล"] },
  clarifying_acid_wash: { name: "เจลล้างหน้าลดการอุดตัน", note: "ซาลิไซลิกแอซิดช่วยดูแลรูขุมขนอุดตัน ความมันช่วงทีโซน และสิวที่ลำตัว", actives: ["ซาลิไซลิกแอซิด 2%"] },
  vitamin_c_15_serum: { name: "เซรั่มวิตามินซี 15%", note: "ช่วยให้ผิวหมองคล้ำและรอยหลังสิวดูจางลง", actives: ["แอล-แอสคอร์บิก 15%", "เฟรูลิก"] },
  retinal_005_night: { name: "เรตินัล 0.05 ไนท์", note: "เรตินัลดีไฮด์แบบห่อหุ้ม ช่วยดูแลผิวไม่เรียบและริ้วรอยเล็ก ๆ", actives: ["เรตินัลดีไฮด์", "สควาเลน"] },
  azelaic_redness_cream: { name: "ครีมอะเซลาอิกลดรอยแดง", note: "ช่วยปลอบประโลมผิวแดงจากโรซาเชียและทำให้สีผิวดูสม่ำเสมอขึ้น", actives: ["อะเซลาอิกแอซิด 15%"] },
  barrier_repair_moisturiser: { name: "มอยส์เจอไรเซอร์ฟื้นฟูเกราะผิว", note: "ครีมเซราไมด์เข้มข้นสำหรับผิวที่เกราะป้องกันอ่อนแอ", actives: ["เซราไมด์", "คอเลสเตอรอล"] },
  hydra_peptide_lotion: { name: "ไฮดราเปปไทด์โลชั่น", note: "เติมความชุ่มชื้นแบบบางเบา เหมาะกับผิวมันและผิวผสม", actives: ["เปปไทด์", "ไฮยาลูรอนิกแอซิด"] },
  mineral_fluid_spf50: { name: "มิเนอรัลฟลูอิด SPF 50", note: "กันแดดซิงก์เนื้อบางเบา ไม่ทิ้งคราบ เหมาะกับผิวหลังทำหัตถการ", actives: ["ซิงก์ออกไซด์"] },
  tinted_shield_spf50: { name: "ทินท์ชิลด์ SPF 50", note: "กันแดดมีสีผสมไอรอนออกไซด์ ช่วยดูแลฝ้าและรอยเม็ดสี", actives: ["ซิงก์", "ไอรอนออกไซด์"] },
};

export function localizeCatalogItem(item: CatalogItem, lang: Lang): CatalogItem {
  if (lang !== "th") return item;
  const copy = PRODUCT_TH[item.id];
  return copy ? { ...item, name: copy.name, note: copy.note, actives: copy.actives ?? item.actives } : item;
}

const ZONE_TH: Record<string, string> = {
  Chin: "คาง", Lips: "ริมฝีปาก", "Under-eyes": "ใต้ตา", "Cheeks & jawline": "แก้มและกรอบหน้า",
  "Full face & chin": "ทั่วหน้าและคาง", "Full face & jawline": "ทั่วหน้าและกรอบหน้า",
  "Full face & lips": "ทั่วหน้าและริมฝีปาก", "Full face & outer eyes": "ทั่วหน้าและหางตา",
  "Full face, under-eye & chin": "ทั่วหน้า ใต้ตา และคาง", "Jawline & chin": "กรอบหน้าและคาง",
  "Jawline & under-eye": "กรอบหน้าและใต้ตา", "Lips & lower face": "ริมฝีปากและใบหน้าส่วนล่าง",
  "Lower face & chin": "ใบหน้าส่วนล่างและคาง", "Lower face & jawline": "ใบหน้าส่วนล่างและกรอบหน้า",
};

const CATEGORY_TH: Record<ResultCategory, string> = {
  "Dermal Filler": "ฟิลเลอร์",
  "Facelift / Thread Lift": "ยกกระชับ / ร้อยไหม",
};

export const localizeResultCategory = (category: ResultCategory, lang: Lang) =>
  lang === "th" ? CATEGORY_TH[category] : category;

const DESCRIPTION_TH: Record<string, string> = {
  "A softer, rounder chin was hiding this patient's profile. One syringe of filler gave it a little more shape — enough that the lower face finally looks balanced from the side.": "เดิมคางค่อนข้างสั้นและมน จึงเติมฟิลเลอร์ 1 ซีซีเพื่อเพิ่มทรงอย่างพอดี ช่วยให้สัดส่วนใบหน้าช่วงล่างดูสมดุลขึ้นเมื่อมองด้านข้างค่ะ",
  "She wanted a chin that read on camera. A single cc, placed carefully, lengthened it just slightly and the whole jaw looks tidier for it.": "คนไข้อยากให้คางดูชัดขึ้นเวลาออกกล้อง จึงเติมฟิลเลอร์ 1 ซีซีอย่างละเอียด เพิ่มความยาวเพียงเล็กน้อยและทำให้กรอบหน้าดูเรียบร้อยขึ้นค่ะ",
  "The goal here was a longer, V-shaped chin rather than anything dramatic. 1 cc of filler, no downtime, and she went straight back to work.": "เคสนี้เน้นให้คางดูยาวและเป็นทรงวีแบบไม่เปลี่ยนหน้ามาก ใช้ฟิลเลอร์ 1 ซีซีและกลับไปใช้ชีวิตประจำวันได้เลยค่ะ",
  "Adding a small amount of projection to the chin pulled the lower third of the face into line. Nothing else was treated.": "เพิ่มความพุ่งของคางเพียงเล็กน้อย ช่วยให้สัดส่วนใบหน้าช่วงล่างสมดุลขึ้น โดยไม่ได้ทำบริเวณอื่นค่ะ",
  "A gentle 1 cc chin augmentation. It smooths the step between lip and chin and makes the profile look more even.": "เติมคางแบบละมุน 1 ซีซี ช่วยให้แนวต่อระหว่างริมฝีปากกับคางดูเรียบและโปรไฟล์สมดุลขึ้นค่ะ",
  "Filler was used to give the chin a slimmer, slightly longer finish — the kind of change friends notice without knowing why.": "เติมฟิลเลอร์ให้คางดูเรียวและยาวขึ้นเล็กน้อย เป็นความเปลี่ยนแปลงที่ดูเป็นธรรมชาติค่ะ",
  "Her lips had thinned over the years. A conservative amount of filler brought back shape and a softer border, still very much her own mouth.": "ริมฝีปากบางลงตามวัย จึงเติมฟิลเลอร์ในปริมาณพอดีเพื่อคืนทรงและขอบปากให้นุ่มขึ้น โดยยังดูเป็นปากเดิมของคนไข้ค่ะ",
  "We rebuilt a little volume and definition here. She asked for natural, so we stopped early — the smile does the rest.": "เติมวอลลุ่มและเก็บขอบปากเล็กน้อยตามที่คนไข้ต้องการแบบธรรมชาติ จึงหยุดในจุดที่พอดีและยังยิ้มสวยเป็นตัวเองค่ะ",
  "Lip filler placed to even out the shape rather than to make it bigger. Hydrated, defined, and comfortable within a couple of days.": "เติมฟิลเลอร์เพื่อปรับทรงปากให้สมดุล ไม่ได้เน้นเพิ่มขนาด ปากดูชุ่มชื้นและคมชัดขึ้น โดยอาการตึงจะค่อย ๆ สบายขึ้นในไม่กี่วันค่ะ",
  "A small top-up gave the upper lip a gentle lift and a clearer outline.": "เติมเพิ่มเพียงเล็กน้อย ช่วยให้ริมฝีปากบนยกขึ้นนิด ๆ และขอบปากชัดขึ้นค่ะ",
  "Threads were placed to lift the tissue that had drifted down over time — the jawline reads sharper immediately, and it keeps settling over the following weeks.": "วางไหมเพื่อพยุงเนื้อเยื่อที่หย่อนลงตามเวลา กรอบหน้าดูชัดขึ้นทันทีและจะค่อย ๆ เข้าที่ในช่วงสัปดาห์ถัดไปค่ะ",
  "This was about tightening a softening lower face. The lift is visible on the day, with only mild tenderness afterwards.": "เคสนี้เน้นกระชับใบหน้าช่วงล่างที่เริ่มหย่อน เห็นแนวยกได้ตั้งแต่วันทำและอาจรู้สึกตึงเล็กน้อยหลังทำค่ะ",
  "A quiet, structural change: the cheek and jaw are supported again, so the face looks rested rather than done.": "ปรับโครงหน้าอย่างนุ่มนวล พยุงแก้มและกรอบหน้าให้กลับมาดูดีขึ้น ผลลัพธ์จึงดูสดใส ไม่ดูทำมาค่ะ",
  "Sagging along the jaw was the main concern. After treatment the contour is cleaner and the neckline looks longer.": "คนไข้กังวลเรื่องความหย่อนบริเวณกรอบหน้า หลังทำแนวกรามดูสะอาดขึ้นและช่วงคอดูยาวขึ้นค่ะ",
};

export function localizeResult(item: BeforeAfterItem, lang: Lang) {
  if (lang !== "th") return item;
  const zone = ZONE_TH[item.zone] ?? item.zone;
  const category = CATEGORY_TH[item.category];
  return {
    ...item,
    category,
    zone,
    description: DESCRIPTION_TH[item.description] ?? "ผลลัพธ์จริงของคนไข้ 888clinic ถ่ายและเผยแพร่โดยได้รับอนุญาตแล้ว ผลของแต่ละคนอาจแตกต่างกันค่ะ",
    alt: `ภาพก่อนและหลัง ${category} บริเวณ${zone} ที่ 888clinic`,
  };
}

export const severityLabel = (value: string, lang: Lang) => lang === "th" ? ({ mild: "เล็กน้อย", moderate: "ปานกลาง", severe: "มาก", unclear: "ยังไม่ชัดเจน" }[value] ?? value) : value;
export const urgencyLabel = (value: string, lang: Lang) => lang === "th" ? ({ routine: "ติดตามตามปกติ", soon: "ควรพบแพทย์เร็ว ๆ นี้", urgent: "ควรพบแพทย์โดยเร็ว" }[value] ?? value) : value;
export const conditionLabel = (value: string, lang: Lang) => lang === "th" ? ({
  "Suspicious melanocytic lesion (possible melanoma)": "รอยโรคเม็ดสีที่ควรให้แพทย์ตรวจ (อาจเป็นเมลาโนมา)",
  "Benign-appearing melanocytic naevus": "ไฝเม็ดสีที่มีลักษณะไม่อันตราย",
  "Seborrhoeic keratosis (benign keratinocytic lesion)": "กระเนื้อ (รอยโรคผิวหนังชนิดไม่อันตราย)",
  "Unclear finding": "ผลยังไม่ชัดเจน",
  "Image not assessable": "รูปนี้ยังประเมินไม่ได้",
}[value] ?? value) : value;