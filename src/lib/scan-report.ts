import { jsPDF } from "jspdf";
import { CLINIC as CLINIC_INFO } from "./clinic";
import { notoSansThaiRegular } from "./fonts/noto-sans-thai-regular";
import { notoSansThaiBold } from "./fonts/noto-sans-thai-bold";
import { conditionLabel, severityLabel, urgencyLabel } from "./public-content";
import type { Lang } from "./i18n";

export const CLINIC = {
  name: "888clinic",
  legalName: CLINIC_INFO.legalName,
  tagline: "Dermatology · Aesthetics · Clinical Skincare",
  doctor: "MALI",
  doctorTitle: "888clinic AI Skin Scanner",
  website: "888clinic.co",
  phone: CLINIC_INFO.phone,
  email: CLINIC_INFO.email,
  address: CLINIC_INFO.address,
  line: CLINIC_INFO.socials.line,
} as const;

export type ReportScan = {
  id: string;
  created_at: string;
  condition: string;
  confidence: number;
  severity: string;
  urgency: string;
  summary: string;
  findings: Array<{ label: string; detail: string }>;
  recommendations: string[];
  body_area?: string;
  concern?: string;
  mali?: { melanoma: number; seborrheicKeratosis: number; modelVersion: string } | null;
};

const GOLD: [number, number, number] = [166, 124, 48];
const GRAPHITE: [number, number, number] = [42, 44, 48];
const GREY: [number, number, number] = [110, 112, 118];
const HAIRLINE: [number, number, number] = [214, 214, 218];

const M = 48;
const FOOTER_SPACE = 74;
const THAI_DOCS = new WeakSet<jsPDF>();

function setReportFont(doc: jsPDF, weight: "normal" | "bold" = "normal", serif = false) {
  if (THAI_DOCS.has(doc)) doc.setFont("NotoSansThai", weight);
  else doc.setFont(serif ? "times" : "helvetica", weight);
}

const reportCopy = (lang: Lang) => lang === "th" ? {
  title: "รายงานคัดกรองผิวหนังด้วย AI", reportNo: "เลขที่รายงาน", patient: "ชื่อผู้รับบริการ", email: "อีเมล",
  date: "วันที่ตรวจ", site: "บริเวณที่ตรวจ", modality: "วิธีตรวจ", modalityValue: "ภาพถ่ายดิจิทัล · วิเคราะห์ภาพด้วย AI",
  reported: "ผู้จัดทำรายงาน", clinic: "คลินิกผู้ดูแล", s1: "1. ข้อมูลผู้รับบริการและเอกสาร", s2: "2. อาการหรือข้อกังวล",
  noConcern: "ไม่ได้ระบุข้อกังวล", s3: "3. ความเห็นจาก AI", confidence: "ความมั่นใจของโมเดล", severity: "ระดับความรุนแรง",
  review: "ระยะเวลาที่ควรพบแพทย์", status: "สถานะผล", screening: "ผลคัดกรองเบื้องต้น — ไม่ใช่การวินิจฉัย",
  s3b: "3ข. โมเดลช่วยประเมินรอยโรค MALI", melanoma: "โอกาสเข้ากลุ่มเมลาโนมา", sk: "โอกาสเข้ากลุ่มกระเนื้อ",
  version: "เวอร์ชันโมเดล", research: "เครื่องมือช่วยประเมิน — ไม่ใช่การวินิจฉัย",
  maliNote: "โมเดล MALI เรียนรู้จากภาพรอยโรคผ่านกล้องผิวหนัง และใช้ประกอบความเห็นหลักของ AI เท่านั้น ระบบอาจแนะนำให้พบแพทย์เร็วขึ้น แต่จะไม่ลดระดับความเร่งด่วน การตรวจชิ้นเนื้อยังเป็นมาตรฐานยืนยันผลค่ะ",
  s4: "4. สิ่งที่เห็นจากภาพ", noFindings: "ไม่พบรายละเอียดจำเพาะที่สรุปได้จากรูปนี้", s5: "5. สรุปการประเมิน",
  noAssessment: "ยังไม่มีข้อความสรุปการประเมิน", s6: "6. คำแนะนำและแผนดูแล",
  defaultPlan: "แนะนำให้พบแพทย์ผิวหนังที่ 888clinic เพื่อยืนยันผลและวางแผนดูแลที่เหมาะสมค่ะ",
  s7: "7. ความงามและข้อมูลคลินิก", aesthetic1: "สามารถวางแผนดูแลด้านความงาม เช่น ทรีตเมนต์ เลเซอร์ หัตถการฉีด และสกินแคร์ทางการแพทย์ได้ในครั้งเดียวกัน หลังจากแพทย์ยืนยันผลด้านผิวหนังแล้วค่ะ",
  aesthetic2: "หากต้องการนัดปรึกษาหรือนำรายงานนี้ให้แพทย์ตรวจ กรุณาติดต่อคลินิกตามข้อมูลด้านล่างค่ะ",
  issued: "ออกเอกสารเมื่อ", disclaimer: "คำเตือนสำคัญ: เอกสารนี้เป็นรายงานคัดกรองด้วย AI จากภาพถ่ายดิจิทัล ไม่ใช่การวินิจฉัย ใบสั่งยา หรือใบส่งตัว และยังไม่ได้ลงนามโดยแพทย์ ผลทั้งหมดควรได้รับการยืนยันจากแพทย์ผิวหนังด้วยการตรวจจริง หากรอยโรคเปลี่ยนขนาด รูปร่าง หรือสี มีเลือดออก เป็นแผล คันต่อเนื่อง หรือโตเร็ว ควรพบแพทย์โดยเร็ว กรุณาเก็บรายงานนี้ไว้เป็นข้อมูลประกอบการรักษาค่ะ",
  medical: "รายงานทางการแพทย์", confidential: "เอกสารผู้รับบริการ — กรุณาเก็บเป็นความลับ", appointments: "คลินิกและการนัดหมาย", page: "หน้า",
} : null;

export function generateScanReport(scan: ReportScan, patient: { name: string; email: string }, lang: Lang = "en") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  if (lang === "th") {
    doc.addFileToVFS("NotoSansThai-Regular.ttf", notoSansThaiRegular);
    doc.addFileToVFS("NotoSansThai-Bold.ttf", notoSansThaiBold);
    doc.addFont("NotoSansThai-Regular.ttf", "NotoSansThai", "normal");
    doc.addFont("NotoSansThai-Bold.ttf", "NotoSansThai", "bold");
    THAI_DOCS.add(doc);
  }
  const th = reportCopy(lang);
  const W = doc.internal.pageSize.getWidth();
  const reportNo = `SR-${new Date(scan.created_at).getFullYear()}-${scan.id.slice(0, 8).toUpperCase()}`;

  let y = letterhead(doc, W);

  // Document title bar
  doc.setFillColor(246, 244, 240);
  doc.rect(M, y, W - M * 2, 30, "F");
  setReportFont(doc, "bold", true);
  doc.setFontSize(12.5);
  doc.setTextColor(...GRAPHITE);
  doc.text(th?.title ?? "AI-ASSISTED DERMATOLOGICAL SCREENING REPORT", M + 12, y + 20);
  setReportFont(doc);
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text(`${th?.reportNo ?? "Report no."} ${reportNo}`, W - M - 12, y + 20, { align: "right" });
  y += 46;

  // Section 1 — Patient & document identification
  y = sectionTitle(doc, th?.s1 ?? "1.  PATIENT & DOCUMENT IDENTIFICATION", y, W);
  y = fieldGrid(doc, y, W, [
    [th?.patient ?? "Patient name", patient.name || patient.email],
    [th?.email ?? "Patient email", patient.email], [th?.reportNo ?? "Report no.", reportNo],
    [th?.date ?? "Examination date", new Date(scan.created_at).toLocaleString(lang === "th" ? "th-TH" : "en-GB")],
    [th?.site ?? "Site examined", scan.body_area || (th ? "ไม่ได้ระบุ" : "Not specified")],
    [th?.modality ?? "Modality", th?.modalityValue ?? "Digital photograph · AI image analysis"],
    [th?.reported ?? "Reported by", `${CLINIC.doctor} — ${CLINIC.doctorTitle}`], [th?.clinic ?? "Reviewing clinic", CLINIC.legalName],
  ]);

  // Section 2 — Clinical history
  y = sectionTitle(doc, th?.s2 ?? "2.  PRESENTING CONCERN / HISTORY", y, W);
  y = body(doc, [scan.concern || th?.noConcern || "No patient-reported concern recorded."], y, W);

  // Section 3 — Impression
  y = sectionTitle(doc, th?.s3 ?? "3.  AI IMPRESSION", y, W);
  setReportFont(doc, "bold", true);
  doc.setFontSize(16);
  doc.setTextColor(...GRAPHITE);
  const cond = doc.splitTextToSize(conditionLabel(scan.condition || "Indeterminate", lang), W - M * 2) as string[];
  doc.text(cond, M, y + 4);
  y += cond.length * 18 + 6;
  setReportFont(doc);
  y = fieldGrid(doc, y, W, [
    [th?.confidence ?? "Model confidence", `${Math.round(scan.confidence * 100)}%`],
    [th?.severity ?? "Severity grade", severityLabel(scan.severity, lang)],
    [th?.review ?? "Recommended review", urgencyLabel(scan.urgency, lang)],
    [th?.status ?? "Diagnostic status", th?.screening ?? "Screening only — not a diagnosis"],
  ]);

  if (scan.mali) {
    y = sectionTitle(doc, th?.s3b ?? "3b.  SECOND-OPINION MODEL (MALI LESION CLASSIFIER)", y, W);
    y = fieldGrid(doc, y, W, [
      [th?.melanoma ?? "Melanoma likelihood", `${Math.round(scan.mali.melanoma * 100)}%`],
      [th?.sk ?? "Seborrheic keratosis", `${Math.round(scan.mali.seborrheicKeratosis * 100)}%`],
      [th?.version ?? "Model version", scan.mali.modelVersion], [th?.status ?? "Status", th?.research ?? "Research aid — not a diagnosis"],
    ]);
    y = body(
      doc,
      [
        th?.maliNote ?? "The MALI classifier is trained on dermoscopic lesion images and is reported alongside the primary AI impression. It may raise the recommended review interval but never reduces it. Histopathology remains the reference standard.",
      ],
      y,
      W,
    );
  }

  // Section 4 — Findings
  y = sectionTitle(doc, th?.s4 ?? "4.  OBJECTIVE FINDINGS ON IMAGE", y, W);
  y = scan.findings.length
    ? findingsTable(doc, scan.findings, y, W)
    : body(doc, [th?.noFindings ?? "No discrete morphological features were extracted from the submitted image."], y, W);

  // Section 5 — Assessment
  y = sectionTitle(doc, th?.s5 ?? "5.  ASSESSMENT", y, W);
  y = body(doc, [scan.summary || th?.noAssessment || "No assessment narrative available."], y, W);

  // Section 6 — Plan
  y = sectionTitle(doc, th?.s6 ?? "6.  PLAN & CLINICAL RECOMMENDATIONS", y, W);
  y = body(
    doc,
    scan.recommendations.length
      ? scan.recommendations
       : [th?.defaultPlan ?? "In-person dermatological assessment at 888clinic for confirmation and treatment planning."],
    y,
    W,
    true,
  );

  // Section 7 — Aesthetic & clinic information
  y = sectionTitle(doc, th?.s7 ?? "7.  AESTHETIC CARE & CLINIC INFORMATION", y, W);
  y = body(
    doc,
    [
      th?.aesthetic1 ?? "Aesthetic and cosmetic-dermatology options (medical facials, laser and light therapy, injectables, prescription skincare) can be planned in the same visit once the medical findings above are confirmed by a clinician.",
      th?.aesthetic2 ?? "To arrange a consultation, or to have this report reviewed in person, contact the clinic using the details below.",
    ],
    y,
    W,
  );
  y = clinicCard(doc, y, W);

  // Signature
  y = ensureSpace(doc, y, 96, W) + 12;
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.6);
  doc.line(M, y, M + 200, y);
  doc.setFontSize(10);
  doc.setTextColor(...GRAPHITE);
  doc.text(CLINIC.doctor, M, y + 15);
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  doc.text(`${CLINIC.doctorTitle} · ${CLINIC.legalName}`, M, y + 28);
  doc.text(`${th?.issued ?? "Issued"} ${new Date().toLocaleString(lang === "th" ? "th-TH" : "en-GB")}`, W - M, y + 15, { align: "right" });
  y += 48;

  // Disclaimer
  const note = doc.splitTextToSize(
    th?.disclaimer ?? "IMPORTANT — MEDICAL DISCLAIMER: This document is an AI-assisted screening report generated from a digital photograph. It does not constitute a medical diagnosis, prescription, or referral, and it has not been signed by a licensed physician. All findings require confirmation by a dermatologist during an in-person examination. Any lesion that is changing in size, shape or colour, bleeding, ulcerating, persistently itching or growing rapidly must be reviewed urgently. Keep this report for your clinical file.",
    W - M * 2 - 24,
  ) as string[];
  const h = note.length * 10.5 + 22;
  y = ensureSpace(doc, y, h, W);
  doc.setFillColor(246, 244, 240);
  doc.rect(M, y, W - M * 2, h, "F");
  doc.setFontSize(7.6);
  doc.setTextColor(...GREY);
  doc.text(note, M + 12, y + 15);

  stampFooters(doc);
  doc.save(`888clinic-skin-report-${scan.id.slice(0, 8)}.pdf`);
}

/** Dark letterhead with full clinic contact details; returns the first usable y. */
function letterhead(doc: jsPDF, W: number) {
  const th = reportCopy(THAI_DOCS.has(doc) ? "th" : "en");
  doc.setFillColor(...GRAPHITE);
  doc.rect(0, 0, W, 108, "F");
  doc.setTextColor(...GOLD);
  setReportFont(doc, "bold", true);
  doc.setFontSize(26);
  doc.text("888", M, 46);
  doc.setTextColor(255, 255, 255);
  doc.text("clinic", M + doc.getTextWidth("888"), 46);
  setReportFont(doc);
  doc.setFontSize(8);
  doc.setTextColor(190, 190, 195);
  doc.text(CLINIC.tagline.toUpperCase(), M, 62);
  doc.text(CLINIC.address, M, 78);
  doc.text(`${CLINIC.phone}  ·  ${CLINIC.email}  ·  ${CLINIC.website}`, M, 92);
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(th?.medical ?? "MEDICAL REPORT", W - M, 46, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(190, 190, 195);
  doc.text(th?.confidential ?? "Confidential patient document", W - M, 62, { align: "right" });
  return 134;
}

function sectionTitle(doc: jsPDF, title: string, y: number, W: number) {
  y = ensureSpace(doc, y, 60, W);
  setReportFont(doc, "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(...GOLD);
  doc.text(title, M, y);
  setReportFont(doc);
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.5);
  doc.line(M, y + 6, W - M, y + 6);
  return y + 22;
}

function fieldGrid(doc: jsPDF, y: number, W: number, fields: Array<[string, string]>) {
  const colW = (W - M * 2) / 2;
  const rows = Math.ceil(fields.length / 2);
  y = ensureSpace(doc, y, rows * 28 + 8, W);
  fields.forEach(([label, value], i) => {
    const x = M + (i % 2) * colW;
    const ry = y + Math.floor(i / 2) * 28;
    doc.setFontSize(7.2);
    doc.setTextColor(...GREY);
    doc.text(label.toUpperCase(), x, ry);
    doc.setFontSize(10);
    doc.setTextColor(...GRAPHITE);
    doc.text(doc.splitTextToSize(String(value), colW - 14)[0] as string, x, ry + 12);
  });
  return y + rows * 28 + 10;
}

function findingsTable(doc: jsPDF, findings: Array<{ label: string; detail: string }>, y: number, W: number) {
  const labelW = 150;
  const detailW = W - M * 2 - labelW - 12;
  findings.forEach((f) => {
    const detail = doc.splitTextToSize(f.detail, detailW) as string[];
    const label = doc.splitTextToSize(f.label, labelW - 10) as string[];
    const rowH = Math.max(detail.length, label.length) * 12 + 12;
    y = ensureSpace(doc, y, rowH, W);
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.4);
    doc.line(M, y - 6, W - M, y - 6);
    doc.setFontSize(9);
    doc.setTextColor(...GRAPHITE);
    setReportFont(doc, "bold");
    doc.text(label, M, y + 6);
    setReportFont(doc);
    doc.setTextColor(...GREY);
    doc.text(detail, M + labelW + 12, y + 6);
    y += rowH;
  });
  return y + 8;
}

function body(doc: jsPDF, lines: string[], y: number, W: number, bullets = false) {
  doc.setFontSize(9.6);
  doc.setTextColor(...GRAPHITE);
  lines.forEach((line) => {
    const text = doc.splitTextToSize((bullets ? "•  " : "") + line, W - M * 2 - 4) as string[];
    y = ensureSpace(doc, y, text.length * 13 + 6, W);
    doc.text(text, M, y);
    y += text.length * 13 + 6;
  });
  return y + 10;
}

/** Clinic address / contact card used in the aesthetic-care section. */
function clinicCard(doc: jsPDF, y: number, W: number) {
  const th = reportCopy(THAI_DOCS.has(doc) ? "th" : "en");
  const h = 78;
  y = ensureSpace(doc, y, h, W);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.rect(M, y, W - M * 2, h);
  doc.setFontSize(7.2);
  doc.setTextColor(...GREY);
  doc.text(th?.appointments ?? "CLINIC & APPOINTMENTS", M + 14, y + 18);
  doc.setFontSize(9.4);
  doc.setTextColor(...GRAPHITE);
  doc.text(CLINIC.legalName, M + 14, y + 34);
  doc.setFontSize(8.6);
  doc.setTextColor(...GREY);
  doc.text(CLINIC.address, M + 14, y + 48);
  doc.text(`Tel ${CLINIC.phone}   ·   ${CLINIC.email}`, M + 14, y + 61);
  doc.text(`${CLINIC.website}   ·   LINE ${CLINIC.line}`, W - M - 14, y + 61, { align: "right" });
  return y + h + 14;
}

function ensureSpace(doc: jsPDF, y: number, needed: number, W: number) {
  const H = doc.internal.pageSize.getHeight();
  if (y + needed > H - FOOTER_SPACE) {
    doc.addPage();
    return letterhead(doc, W);
  }
  return y;
}

/** Address + page numbering on every page. */
function stampFooters(doc: jsPDF) {
  const th = reportCopy(THAI_DOCS.has(doc) ? "th" : "en");
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.5);
    doc.line(M, H - 46, W - M, H - 46);
    setReportFont(doc);
    doc.setFontSize(7.2);
    doc.setTextColor(...GREY);
    doc.text(`${CLINIC.legalName} · ${CLINIC.address}`, M, H - 32);
    doc.text(`Tel ${CLINIC.phone} · ${CLINIC.email} · ${CLINIC.website}`, M, H - 22);
    doc.text(th ? `${th.page} ${p} / ${total}` : `Page ${p} of ${total}`, W - M, H - 22, { align: "right" });
  }
}

function cap(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "—";
}
