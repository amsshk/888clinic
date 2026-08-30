import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search, Plus, Printer, Save, X, FileDown, ScrollText, SlidersHorizontal } from "lucide-react";
import ReportTemplateEditor from "./ReportTemplateEditor";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  listPatientReportAudit,
  logPatientReportAccess,
  type ReportAuditAction,
  type ReportAuditEntry,
} from "@/lib/patient-audit.functions";

/** Fire-and-forget audit trail entry; never blocks or breaks the admin action. */
function recordReportAccess(patientId: string, action: ReportAuditAction) {
  void logPatientReportAccess({ data: { patientId, action } }).catch(() => undefined);
}


type Patient = {
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

const COLS =
  "id, hn, full_name, nickname, age, phone, address, first_visit, treatment_notes, created_at";
const PAGE_SIZE = 60;

const digits = (v: string) => v.replace(/\D/g, "");

export function PatientsTab() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Patient[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [adding, setAdding] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const requestId = useRef(0);


  const openPatient = useCallback((p: Patient) => {
    setSelected(p);
    recordReportAccess(p.id, "open");
  }, []);


  const load = useCallback(async (term: string, requestedPage: number) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    let request = supabase.from("patients").select(COLS, { count: "exact" });

    const trimmed = term.trim();
    if (trimmed) {
      const d = digits(trimmed);
      const filters = [`full_name.ilike.%${trimmed}%`, `nickname.ilike.%${trimmed}%`];
      if (d.length >= 3) {
        filters.push(`phone_digits.ilike.%${d}%`);
        filters.push(`hn.ilike.%${d}%`);
      }
      request = request.or(filters.join(","));
    }

    const { data, error, count } = await request
      .order("hn", { ascending: false, nullsFirst: false })
      .range(requestedPage * PAGE_SIZE, requestedPage * PAGE_SIZE + PAGE_SIZE - 1);

    if (currentRequest !== requestId.current) return;
    if (error) toast.error("Could not load patients");
    setRows((data as Patient[]) ?? []);
    setTotal(count ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query, page), 250);
    return () => clearTimeout(t);
  }, [query, page, load]);

  const pageCount = total === null ? 1 : Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastShown = Math.min((page + 1) * PAGE_SIZE, total ?? rows.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[260px] flex-1 space-y-2">
          <Label htmlFor="patient-search">Search by phone number, HN or name</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="patient-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="0911944949 · 640002 · ฟาติมา"
              className="rounded-none pl-9"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => setShowAudit((v) => !v)}
          >
            <ScrollText className="size-4" /> {showAudit ? "Hide" : "Report"} audit log
          </Button>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => setShowTemplate((v) => !v)}
          >
            <SlidersHorizontal className="size-4" /> Report template
          </Button>
          <Button className="rounded-none" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> New patient
          </Button>
        </div>
      </div>

      {showTemplate && <ReportTemplateEditor onClose={() => setShowTemplate(false)} />}

      {showAudit && <ReportAuditLog />}


      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {total === null ? "—" : `${total} patient${total === 1 ? "" : "s"} on file`}
        {total ? ` · showing ${firstShown}–${lastShown}` : ""}
      </p>

      {adding && (
        <PatientForm
          onCancel={() => setAdding(false)}
          onSaved={(p) => {
            setAdding(false);
            setSelected(p);
            load(query, page);
          }}
        />
      )}

      {loading ? (
        <Loader2 className="size-5 animate-spin text-gold" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No patient matches that search.</p>
      ) : (
        <div className="space-y-px bg-border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2 bg-card pr-3 transition-colors hover:bg-shell">
              <button
                type="button"
                onClick={() => openPatient(row)}
                className="block min-w-0 flex-1 p-4 text-left"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="text-base">
                    {row.full_name}
                    {row.nickname ? (
                      <span className="text-muted-foreground"> · {row.nickname}</span>
                    ) : null}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    HN {row.hn ?? "—"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {row.phone ?? "no phone"}
                  {row.age ? ` · ${row.age} yrs` : ""}
                  {row.address ? ` · ${row.address}` : ""}
                </p>
              </button>
              <ReportActions patient={row} compact />
            </div>
          ))}
        </div>
      )}

      {total !== null && total > PAGE_SIZE && (
        <nav className="flex items-center justify-between border-t border-border pt-4" aria-label="Patient pages">
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            disabled={loading || page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {pageCount}
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            disabled={loading || page + 1 >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </nav>
      )}


      {selected && (
        <PatientReport
          patient={selected}
          onClose={() => setSelected(null)}
          onSaved={(p) => {
            setSelected(p);
            load(query, page);
          }}
        />
      )}
    </div>
  );
}

function PatientForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (p: Patient) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ageRaw = String(fd.get("age") ?? "").trim();
    setBusy(true);
    const { data, error } = await supabase
      .from("patients")
      .insert({
        hn: String(fd.get("hn") ?? "").trim() || null,
        full_name: String(fd.get("full_name") ?? "").trim(),
        nickname: String(fd.get("nickname") ?? "").trim() || null,
        age: ageRaw ? Number(ageRaw) : null,
        phone: String(fd.get("phone") ?? "").trim() || null,
        address: String(fd.get("address") ?? "").trim() || null,
        first_visit: String(fd.get("first_visit") ?? "").trim() || null,
        treatment_notes: String(fd.get("treatment_notes") ?? "").trim() || null,
      })
      .select(COLS)
      .single();
    setBusy(false);

    if (error) {
      toast.error(error.message.includes("patients_hn_key") ? "That HN already exists" : "Could not save");
      return;
    }
    toast.success("Patient added");
    onSaved(data as Patient);
  }

  return (
    <form onSubmit={submit} className="border border-border bg-card p-6">
      <h2 className="text-lg">New patient record</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field name="hn" label="HN" />
        <Field name="full_name" label="Full name" required />
        <Field name="nickname" label="Nickname" />
        <Field name="age" label="Age" type="number" />
        <Field name="phone" label="Phone" />
        <Field name="first_visit" label="First visit" />
        <div className="sm:col-span-2">
          <Field name="address" label="Address" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="treatment_notes">Treatment history</Label>
          <Textarea id="treatment_notes" name="treatment_notes" rows={3} className="rounded-none" />
        </div>
      </div>
      <div className="mt-5 flex gap-3">
        <Button type="submit" disabled={busy} className="rounded-none">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
        </Button>
        <Button type="button" variant="outline" className="rounded-none" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="rounded-none"
      />
    </div>
  );
}

function PatientReport({
  patient,
  onClose,
  onSaved,
}: {
  patient: Patient;
  onClose: () => void;
  onSaved: (p: Patient) => void;
}) {
  const [notes, setNotes] = useState(patient.treatment_notes ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => setNotes(patient.treatment_notes ?? ""), [patient]);

  const lines = useMemo(
    () =>
      (patient.treatment_notes ?? "")
        .split("|")
        .map((l) => l.trim())
        .filter(Boolean),
    [patient.treatment_notes],
  );

  async function save() {
    setBusy(true);
    const { data, error } = await supabase
      .from("patients")
      .update({ treatment_notes: notes.trim() || null })
      .eq("id", patient.id)
      .select(COLS)
      .single();
    setBusy(false);
    if (error) {
      toast.error("Could not save notes");
      return;
    }
    toast.success("Report updated");
    onSaved(data as Patient);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 py-10">
      <div className="w-full max-w-2xl border border-border bg-card">
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <p className="eyebrow">Patient report</p>
            <h2 className="mt-2 text-2xl">{patient.full_name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              HN {patient.hn ?? "—"}
              {patient.nickname ? ` · ${patient.nickname}` : ""}
            </p>
          </div>
          <Button size="sm" variant="ghost" className="rounded-none" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
          <Detail label="Phone" value={patient.phone} />
          <Detail label="Age" value={patient.age ? String(patient.age) : null} />
          <Detail label="First visit" value={patient.first_visit} />
          <Detail label="Record created" value={new Date(patient.created_at).toLocaleDateString()} />
          <div className="sm:col-span-2">
            <Detail label="Address" value={patient.address} />
          </div>
        </div>

        <div className="border-t border-border p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Treatment history</p>
          {lines.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {lines.map((line, i) => (
                <li key={i} className="border-l-2 border-gold pl-3 leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No treatment history recorded yet.</p>
          )}

          <div className="mt-5 space-y-2">
            <Label htmlFor="notes">Edit history (separate entries with “|”)</Label>
            <Textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-none"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="rounded-none" disabled={busy} onClick={save}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
            </Button>
            <ReportActions patient={patient} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportActions({ patient, compact = false }: { patient: Patient; compact?: boolean }) {
  const [busy, setBusy] = useState<"pdf" | "print" | null>(null);

  async function run(kind: "pdf" | "print") {
    setBusy(kind);
    try {
      const { downloadPatientReport, printPatientReport } = await import("@/lib/patient-report");
      if (kind === "pdf") {
        await downloadPatientReport(patient);
        recordReportAccess(patient.id, "download");
        toast.success("Report PDF downloaded");
      } else {
        await printPatientReport(patient);
        recordReportAccess(patient.id, "print");
      }

    } catch {
      toast.error("Could not generate the report");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        className="rounded-none"
        disabled={busy !== null}
        onClick={() => run("pdf")}
        aria-label={`Download PDF report for ${patient.full_name}`}
      >
        {busy === "pdf" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <FileDown className="size-4" />
        )}
        {compact ? "PDF" : "Download PDF"}
      </Button>
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        className="rounded-none"
        disabled={busy !== null}
        onClick={() => run("print")}
        aria-label={`Print report for ${patient.full_name}`}
      >
        {busy === "print" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Printer className="size-4" />
        )}
        {compact ? "" : "Print"}
      </Button>
    </div>
  );
}


function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

const ACTION_LABEL: Record<ReportAuditAction, string> = {
  open: "Opened report",
  download: "Downloaded PDF",
  print: "Printed report",
};

function ReportAuditLog() {
  const [entries, setEntries] = useState<ReportAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPatientReportAudit({ data: {} });
      if (res.ok) setEntries(res.entries);
      else toast.error(res.error);
    } catch {
      toast.error("Could not load the audit log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="border border-border bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4">
        <div>
          <p className="eyebrow">Report audit log</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Every time a patient record is opened, downloaded or printed.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="rounded-none" disabled={loading} onClick={() => void load()}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>
      {loading ? (
        <div className="p-4">
          <Loader2 className="size-5 animate-spin text-gold" />
        </div>
      ) : entries.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No report activity recorded yet.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-border overflow-y-auto">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 p-3 text-sm">
              <span>
                {ACTION_LABEL[e.action]} · {e.patient_name}
                <span className="text-muted-foreground"> · HN {e.patient_hn ?? "—"}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {e.actor_email ?? "unknown admin"} · {new Date(e.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
