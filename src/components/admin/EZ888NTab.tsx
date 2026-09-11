import { useState } from "react";
import { ArrowRight, Database, FileSpreadsheet, Sparkles, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientBulkImport } from "./PatientBulkImport";

export function EZ888NTab({ onNavigateToPatients }: { onNavigateToPatients?: () => void }) {
  const [importing, setImporting] = useState(false);

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6">
        <p className="eyebrow">Data migration &amp; integration</p>
        <h2 className="mt-2 text-3xl font-light">
          EZ888N <span className="text-gradient-gold">migration workspace</span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Import and migrate historical patient records and clinical histories from EZ888N into the
          888clinic database. Once imported, all patient files are immediately accessible,
          searchable, and manageable in the Patients tab.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col justify-between border border-border bg-card p-6">
          <div className="space-y-3">
            <div className="flex size-10 items-center justify-center border border-gold/30 bg-gold/10 text-gold">
              <Upload className="size-5" />
            </div>
            <h3 className="text-lg font-medium">Import EZ888N records</h3>
            <p className="text-sm text-muted-foreground">
              Paste patient data exported from EZ888N spreadsheets (CSV/TSV). Supports automatic
              field mapping for Hospital Numbers (HN), full names, nicknames, age, phone numbers,
              first visit dates, addresses, and treatment notes.
            </p>
          </div>
          <div className="mt-6">
            <Button
              className="w-full rounded-none sm:w-auto"
              onClick={() => setImporting(true)}
            >
              <FileSpreadsheet className="size-4" /> Import EZ888N records
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-between border border-border bg-card p-6">
          <div className="space-y-3">
            <div className="flex size-10 items-center justify-center border border-border bg-secondary text-foreground">
              <Users className="size-5" />
            </div>
            <h3 className="text-lg font-medium">Review patient records</h3>
            <p className="text-sm text-muted-foreground">
              View all migrated records in the active clinic database. Search by phone number, HN, or
              Thai name, edit clinical summaries, view audit trails, and generate printable patient reports.
            </p>
          </div>
          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full rounded-none sm:w-auto"
              onClick={() => onNavigateToPatients?.()}
            >
              Open patient records <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="border border-border bg-card/60 p-6">
        <div className="flex items-start gap-4">
          <div className="mt-1 flex size-8 items-center justify-center border border-border text-muted-foreground">
            <Database className="size-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-medium">How EZ888N migration works</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Records imported through EZ888N migration are validated and inserted directly into the
              primary 888clinic patient registry. Existing records with matching Hospital Numbers
              (HN) are safely deduplicated to prevent collisions. Treatment histories and contact
              details are immediately synchronized across all clinic administrative tools.
            </p>
          </div>
        </div>
      </div>

      {importing && (
        <PatientBulkImport
          onClose={() => setImporting(false)}
          onImported={() => {
            setImporting(false);
            if (onNavigateToPatients) {
              onNavigateToPatients();
            }
          }}
        />
      )}
    </div>
  );
}