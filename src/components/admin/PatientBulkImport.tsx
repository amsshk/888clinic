import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { parsePatientImportText, type PatientImportRow } from "@/lib/patient-import.shared";
import { bulkImportPatients } from "@/lib/patient-import.functions";

export function PatientBulkImport({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const runImport = useServerFn(bulkImportPatients);

  const parsed = useMemo(() => (text.trim() ? parsePatientImportText(text) : null), [text]);
  const previewRows: PatientImportRow[] = parsed?.rows.slice(0, 20) ?? [];

  async function submit() {
    if (!parsed || parsed.rows.length === 0) return;
    setBusy(true);
    try {
      const result = await runImport({ data: { rows: parsed.rows } });
      if (!result.ok && result.imported === 0) {
        toast.error(result.error ?? "Import failed");
        return;
      }
      const parts = [`${result.imported} patient${result.imported === 1 ? "" : "s"} imported`];
      if (result.skippedDuplicates.length > 0) {
        parts.push(`${result.skippedDuplicates.length} skipped (existing HN)`);
      }
      if (result.error) {
        toast.warning(parts.join(" · ") + ` — ${result.error}`);
      } else {
        toast.success(parts.join(" · "));
      }
      onImported();
    } catch {
      toast.error("Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 py-10">
      <div className="w-full max-w-3xl border border-border bg-card">
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <p className="eyebrow">Bulk import</p>
            <h2 className="mt-2 text-2xl">Import patients</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste rows copied from a spreadsheet (tab-separated) or CSV. First row must be a
              header with at least a "name" column; recognized columns: HN, name, nickname, age,
              phone, address, first visit, treatment notes.
            </p>
          </div>
          <Button size="sm" variant="ghost" className="rounded-none" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 p-6">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="HN	Name	Nickname	Age	Phone	Address	First visit	Treatment notes"
            className="rounded-none font-mono text-xs"
          />

          {parsed && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} ready
                {parsed.errors.length > 0 ? ` · ${parsed.errors.length} skipped` : ""}
              </p>

              {parsed.errors.length > 0 && (
                <ul className="max-h-24 overflow-y-auto border border-border p-3 text-xs text-destructive">
                  {parsed.errors.map((e, i) => (
                    <li key={i}>
                      {e.line > 0 ? `Line ${e.line}: ` : ""}
                      {e.message}
                    </li>
                  ))}
                </ul>
              )}

              {previewRows.length > 0 && (
                <div className="max-h-64 overflow-auto border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-shell">
                      <tr>
                        <th className="p-2">HN</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Phone</th>
                        <th className="p-2">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="p-2">{row.hn ?? "—"}</td>
                          <td className="p-2">{row.full_name}</td>
                          <td className="p-2">{row.phone ?? "—"}</td>
                          <td className="p-2">{row.age ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > previewRows.length && (
                    <p className="p-2 text-xs text-muted-foreground">
                      +{parsed.rows.length - previewRows.length} more row(s) not shown
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              className="rounded-none"
              disabled={busy || !parsed || parsed.rows.length === 0}
              onClick={submit}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Import {parsed ? parsed.rows.length : ""} patient
              {parsed?.rows.length === 1 ? "" : "s"}
            </Button>
            <Button type="button" variant="outline" className="rounded-none" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
