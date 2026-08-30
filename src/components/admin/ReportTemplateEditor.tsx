import { useEffect, useState } from "react";
import { Eye, Loader2, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_PATIENT_REPORT_TEMPLATE,
  loadPatientReportTemplate,
  savePatientReportTemplate,
  type PatientReportSection,
  type PatientReportTemplate,
} from "@/lib/report-template";
import type { PatientRecord } from "@/lib/patient-report";

const SECTION_LABELS: Array<[PatientReportSection, string, string]> = [
  ["meta", "Patient details grid", "HN, nickname, phone, age, first visit"],
  ["address", "Address block", "Printed only when the record has an address"],
  ["history", "Treatment history", "Every visit note on the record"],
  ["signature", "Clinic sign-off", "Signature line, clinic name and role"],
  ["confidentiality", "Confidentiality note", "Grey box at the bottom of the page"],
];

const META_LABELS: Array<[keyof PatientReportTemplate["metaFields"], string]> = [
  ["hn", "HN"],
  ["nickname", "Nickname"],
  ["phone", "Phone"],
  ["age", "Age"],
  ["first_visit", "First visit"],
  ["created_at", "Record created"],
];

const SAMPLE: PatientRecord = {
  id: "00000000-0000-0000-0000-000000000000",
  hn: "6601770",
  full_name: "ตัวอย่าง ผู้ป่วย · Sample Patient",
  nickname: "ฟ้า",
  age: 38,
  phone: "061-937-5859",
  address: "888 Clinic · Nakhon Pathom – Bangkok, Thailand",
  first_visit: "2024-01-15",
  treatment_notes:
    "Botox 20u glabella · follow-up in 3 months | HA filler 1ml cheeks | Laser toning ×3 sessions",
  created_at: new Date().toISOString(),
};

export default function ReportTemplateEditor({ onClose }: { onClose: () => void }) {
  const [template, setTemplate] = useState<PatientReportTemplate | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadPatientReportTemplate()
      .then(setTemplate)
      .catch(() => setTemplate(DEFAULT_PATIENT_REPORT_TEMPLATE));
  }, []);

  function patch(next: Partial<PatientReportTemplate>) {
    setTemplate((t) => (t ? { ...t, ...next } : t));
  }

  async function save() {
    if (!template) return;
    setBusy(true);
    try {
      await savePatientReportTemplate(template);
      toast.success("Report template saved");
    } catch {
      toast.error("Could not save the template");
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    if (!template) return;
    const { buildPatientReport } = await import("@/lib/patient-report");
    const doc = await buildPatientReport(SAMPLE, template);
    window.open(doc.output("bloburl") as unknown as string, "_blank");
  }

  if (!template) {
    return (
      <div className="border border-border bg-card p-6">
        <Loader2 className="size-5 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="border border-border bg-card">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <p className="eyebrow">Report template</p>
          <h3 className="mt-1 text-lg">Choose the sections and branding on every patient PDF</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Applies to every downloaded or printed patient record, for all admins.
          </p>
        </div>
        <Button variant="ghost" size="icon" className="rounded-none" onClick={onClose} aria-label="Close template editor">
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid gap-8 p-5 md:grid-cols-2">
        <div className="space-y-4">
          <p className="eyebrow">Sections</p>
          {SECTION_LABELS.map(([key, label, hint]) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={`sec-${key}`} className="text-sm">
                  {label}
                </Label>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              <Switch
                id={`sec-${key}`}
                checked={template.sections[key]}
                onCheckedChange={(v) => patch({ sections: { ...template.sections, [key]: v } })}
              />
            </div>
          ))}

          <div className="pt-2">
            <p className="eyebrow">Detail fields</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {META_LABELS.map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-2 text-sm">
                  <span>{label}</span>
                  <Switch
                    checked={template.metaFields[key]}
                    disabled={!template.sections.meta}
                    onCheckedChange={(v) =>
                      patch({ metaFields: { ...template.metaFields, [key]: v } })
                    }
                    aria-label={`Show ${label}`}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <Label htmlFor="printed-stamp" className="text-sm">
              Printed date & time under the signature
            </Label>
            <Switch
              id="printed-stamp"
              checked={template.showPrintedTimestamp}
              onCheckedChange={(v) => patch({ showPrintedTimestamp: v })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <p className="eyebrow">Branding</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Report title" value={template.reportTitle} onChange={(v) => patch({ reportTitle: v })} />
            <Field label="Website" value={template.website} onChange={(v) => patch({ website: v })} />
            <Field label="Wordmark (accent)" value={template.brandAccent} onChange={(v) => patch({ brandAccent: v })} />
            <Field label="Wordmark (white)" value={template.brandName} onChange={(v) => patch({ brandName: v })} />
          </div>
          <Field label="Tagline" value={template.tagline} onChange={(v) => patch({ tagline: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sign-off name" value={template.signatureName} onChange={(v) => patch({ signatureName: v })} />
            <Field
              label="Sign-off role (optional)"
              value={template.signatureRole}
              onChange={(v) => patch({ signatureRole: v })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accent-color">Accent colour</Label>
            <div className="flex items-center gap-3">
              <input
                id="accent-color"
                type="color"
                value={template.accentColor}
                onChange={(e) => patch({ accentColor: e.target.value })}
                className="h-10 w-14 cursor-pointer border border-border bg-card"
              />
              <Input
                value={template.accentColor}
                onChange={(e) => patch({ accentColor: e.target.value })}
                className="rounded-none"
                aria-label="Accent colour hex value"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confidentiality">Confidentiality note</Label>
            <Textarea
              id="confidentiality"
              value={template.confidentialityNote}
              onChange={(e) => patch({ confidentialityNote: e.target.value })}
              rows={3}
              className="rounded-none"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border p-5">
        <Button className="rounded-none" disabled={busy} onClick={save}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save template
        </Button>
        <Button variant="outline" className="rounded-none" onClick={preview}>
          <Eye className="size-4" /> Preview sample PDF
        </Button>
        <Button
          variant="ghost"
          className="rounded-none"
          onClick={() => setTemplate(DEFAULT_PATIENT_REPORT_TEMPLATE)}
        >
          <RotateCcw className="size-4" /> Reset to defaults
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `field-${label.replace(/[^a-z]+/gi, "-").toLowerCase()}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-none" />
    </div>
  );
}
