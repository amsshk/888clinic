import { jsPDF } from "jspdf";
import { CLINIC as CLINIC_INFO } from "./clinic";
import {
  DEFAULT_PATIENT_REPORT_TEMPLATE,
  hexToRgb,
  loadPatientReportTemplate,
  type PatientReportTemplate,
} from "./report-template";


export type PatientRecord = {
  id: string;
  hn: string | null;
  full_name: string;
  nickname: string | null;
  age: number | null;
  phone: string | null;
  address: string | null;
  first_visit: string | null;
  treatment_notes: string | null;
  created_at: string;
};

const GOLD: [number, number, number] = [166, 124, 48];
const GRAPHITE: [number, number, number] = [42, 44, 48];
const GREY: [number, number, number] = [110, 112, 118];

const FONT = "NotoSansThai";

async function withThaiFont(doc: jsPDF) {
  const [{ notoSansThaiRegular }, { notoSansThaiBold }] = await Promise.all([
    import("./fonts/noto-sans-thai-regular"),
    import("./fonts/noto-sans-thai-bold"),
  ]);
  doc.addFileToVFS("NotoSansThai-Regular.ttf", notoSansThaiRegular);
  doc.addFont("NotoSansThai-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("NotoSansThai-Bold.ttf", notoSansThaiBold);
  doc.addFont("NotoSansThai-Bold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");
}

export function historyLines(notes: string | null) {
  return (notes ?? "")
    .split("|")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function patientReportFileName(patient: PatientRecord) {
  const id = patient.hn?.trim() || patient.id.slice(0, 8);
  const name = patient.full_name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return `888clinic-patient-${id}-${name}.pdf`.slice(0, 120);
}

/** Builds the branded, auto-paginating patient record PDF from a template. */
export async function buildPatientReport(
  patient: PatientRecord,
  template: PatientReportTemplate = DEFAULT_PATIENT_REPORT_TEMPLATE,
): Promise<jsPDF> {
  const t = template;
  const ACCENT = hexToRgb(t.accentColor);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await withThaiFont(doc);
  const page = doc.internal.pageSize;
  const W = page.getWidth();
  const H = page.getHeight();
  const M = 48;

  // Header band
  doc.setFillColor(...GRAPHITE);
  doc.rect(0, 0, W, 92, "F");
  doc.setFont(FONT, "bold");
  doc.setFontSize(24);
  doc.setTextColor(...ACCENT);
  doc.text(t.brandAccent, M, 52);
  doc.setTextColor(255, 255, 255);
  doc.text(t.brandName, M + doc.getTextWidth(t.brandAccent), 52);
  doc.setFont(FONT, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(190, 190, 195);
  if (t.tagline) doc.text(t.tagline.toUpperCase(), M, 70);
  if (t.website) doc.text(t.website, W - M, 70, { align: "right" });
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  if (t.reportTitle) doc.text(t.reportTitle, W - M, 52, { align: "right" });

  // Name
  let y = 132;
  doc.setTextColor(...GREY);
  doc.setFontSize(7.5);
  doc.text("PATIENT", M, y);
  doc.setFont(FONT, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...GRAPHITE);
  doc.text(patient.full_name || "—", M, y + 24, { maxWidth: W - M * 2 });
  doc.setFont(FONT, "normal");
  y += 48;

  // Meta grid
  if (t.sections.meta) {
    const all: Array<[keyof PatientReportTemplate["metaFields"], string, string]> = [
      ["hn", "HN", patient.hn || "—"],
      ["nickname", "Nickname", patient.nickname || "—"],
      ["phone", "Phone", patient.phone || "—"],
      ["age", "Age", patient.age ? String(patient.age) : "—"],
      ["first_visit", "First visit", patient.first_visit || "—"],
      ["created_at", "Record created", new Date(patient.created_at).toLocaleDateString()],
    ];
    const meta = all.filter(([field]) => t.metaFields[field]);
    meta.forEach(([, label, value], i) => {
      const x = M + (i % 2) * ((W - M * 2) / 2);
      const ry = y + Math.floor(i / 2) * 30;
      doc.setTextColor(...GREY);
      doc.setFontSize(7.5);
      doc.text(label.toUpperCase(), x, ry);
      doc.setTextColor(...GRAPHITE);
      doc.setFontSize(10.5);
      doc.text(value.slice(0, 48), x, ry + 13);
    });
    y += Math.ceil(meta.length / 2) * 30 + 6;
  }

  if (t.sections.address && patient.address) {
    doc.setTextColor(...GREY);
    doc.setFontSize(7.5);
    doc.text("ADDRESS", M, y);
    doc.setTextColor(...GRAPHITE);
    doc.setFontSize(10.5);
    const addr = doc.splitTextToSize(patient.address, W - M * 2) as string[];
    doc.text(addr, M, y + 13);
    y += 13 + addr.length * 13 + 8;
  }

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(1);
  doc.line(M, y, W - M, y);
  y += 26;

  // Treatment history
  if (t.sections.history) {
    doc.setTextColor(...GREY);
    doc.setFontSize(7.5);
    doc.text("TREATMENT HISTORY", M, y);
    y += 18;
    const lines = historyLines(patient.treatment_notes);
    doc.setFontSize(10);
    doc.setTextColor(...GRAPHITE);
    if (lines.length === 0) {
      doc.setTextColor(...GREY);
      doc.text("No treatment history recorded yet.", M, y);
      y += 18;
    } else {
      lines.forEach((line) => {
        const text = doc.splitTextToSize(`•  ${line}`, W - M * 2 - 4) as string[];
        if (y + text.length * 14 > H - 120) {
          doc.addPage();
          y = M;
        }
        doc.text(text, M, y);
        y += text.length * 14 + 6;
      });
    }
  }

  // Footer / confidentiality
  if (t.sections.signature || t.sections.confidentiality) {
    if (y + 96 > H - 20) {
      doc.addPage();
      y = M;
    }
    y += 18;
  }

  if (t.sections.signature) {
    doc.setDrawColor(210, 210, 214);
    doc.setLineWidth(0.6);
    doc.line(M, y, M + 190, y);
    doc.setFontSize(10);
    doc.setTextColor(...GRAPHITE);
    doc.text(t.signatureName, M, y + 16);
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    let sy = y + 30;
    if (t.signatureRole) {
      doc.text(t.signatureRole, M, sy);
      sy += 13;
    }
    if (t.showPrintedTimestamp) doc.text(`Printed ${new Date().toLocaleString()}`, M, sy);
    y = Math.max(y, sy - 30);
  }

  if (t.sections.confidentiality && t.confidentialityNote) {
    const note = doc.splitTextToSize(t.confidentialityNote, W - M * 2 - 24) as string[];
    const boxTop = t.sections.signature ? y + 46 : y;
    const boxHeight = Math.max(46, note.length * 11 + 24);
    doc.setFillColor(246, 244, 240);
    doc.rect(M, boxTop, W - M * 2, boxHeight, "F");
    doc.setFontSize(7.8);
    doc.setTextColor(...GREY);
    doc.text(note, M + 12, boxTop + 16);
  }

  // Clinic address / contact footer on every page
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(214, 214, 218);
    doc.setLineWidth(0.5);
    doc.line(M, H - 46, W - M, H - 46);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...GREY);
    doc.text(`${CLINIC_INFO.legalName} · ${CLINIC_INFO.address}`, M, H - 32);
    doc.text(`Tel ${CLINIC_INFO.phone} · ${CLINIC_INFO.email} · 888clinic.co`, M, H - 22);
    doc.text(`Page ${p} of ${total}`, W - M, H - 22, { align: "right" });
  }

  return doc;
}

/** Builds the report using the clinic's saved template. */
async function buildWithSavedTemplate(patient: PatientRecord) {
  let template = DEFAULT_PATIENT_REPORT_TEMPLATE;
  try {
    template = await loadPatientReportTemplate();
  } catch {
    /* fall back to defaults */
  }
  return buildPatientReport(patient, template);
}


/** One-click download of the patient PDF. */
export async function downloadPatientReport(patient: PatientRecord) {
  const doc = await buildWithSavedTemplate(patient);
  doc.save(patientReportFileName(patient));
}

/** One-click print: renders the PDF and opens the browser print dialog on it. */
export async function printPatientReport(patient: PatientRecord) {
  const doc = await buildWithSavedTemplate(patient);
  const url = doc.output("bloburl") as unknown as string;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.src = String(url);
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.open(String(url), "_blank");
    }
    setTimeout(() => frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
}
