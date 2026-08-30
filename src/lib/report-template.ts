import { supabase } from "@/integrations/supabase/client";
import { CLINIC } from "./clinic";

export const REPORT_TEMPLATE_KEY = "patient_report";

export type PatientReportSection =
  | "meta"
  | "address"
  | "history"
  | "signature"
  | "confidentiality";

export type PatientReportTemplate = {
  /** Title printed on the right of the header band. */
  reportTitle: string;
  /** Brand wordmark: the gold part and the light part. */
  brandAccent: string;
  brandName: string;
  tagline: string;
  website: string;
  /** Name signed at the bottom of the record. */
  signatureName: string;
  signatureRole: string;
  confidentialityNote: string;
  /** Hex accent colour used for the wordmark and the divider rule. */
  accentColor: string;
  /** Which optional blocks are printed. */
  sections: Record<PatientReportSection, boolean>;
  /** Meta fields printed in the two-column grid, in order. */
  metaFields: Record<"hn" | "nickname" | "phone" | "age" | "first_visit" | "created_at", boolean>;
  showPrintedTimestamp: boolean;
};

export const DEFAULT_PATIENT_REPORT_TEMPLATE: PatientReportTemplate = {
  reportTitle: "Patient Record",
  brandAccent: "888",
  brandName: "clinic",
  tagline: "Medical dermatology & aesthetics",
  website: "888clinic.co",
  signatureName: CLINIC.name,
  signatureRole: "",
  confidentialityNote:
    "Confidential medical record. For clinic use only — do not share outside 888clinic without the patient's consent.",
  accentColor: "#A67C30",
  sections: {
    meta: true,
    address: true,
    history: true,
    signature: true,
    confidentiality: true,
  },
  metaFields: {
    hn: true,
    nickname: true,
    phone: true,
    age: true,
    first_visit: true,
    created_at: true,
  },
  showPrintedTimestamp: true,
};

/** Merges a stored (possibly partial) config over the defaults. */
export function normalizeTemplate(raw: unknown): PatientReportTemplate {
  const d = DEFAULT_PATIENT_REPORT_TEMPLATE;
  if (!raw || typeof raw !== "object") return d;
  const v = raw as Partial<PatientReportTemplate>;
  return {
    ...d,
    ...v,
    sections: { ...d.sections, ...(v.sections ?? {}) },
    metaFields: { ...d.metaFields, ...(v.metaFields ?? {}) },
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [166, 124, 48];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Loads the saved patient-report template (falls back to defaults). */
export async function loadPatientReportTemplate(): Promise<PatientReportTemplate> {
  const { data } = await supabase
    .from("report_settings")
    .select("config")
    .eq("key", REPORT_TEMPLATE_KEY)
    .maybeSingle();
  return normalizeTemplate(data?.config);
}

/** Saves the template (admin-only, enforced by row-level security). */
export async function savePatientReportTemplate(template: PatientReportTemplate) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("report_settings").upsert(
    {
      key: REPORT_TEMPLATE_KEY,
      config: JSON.parse(JSON.stringify(template)),
      updated_by: auth.user?.id ?? null,
    },
    { onConflict: "key" },
  );
  if (error) throw error;
}
