import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-users.shared";
import { bulkImportPatientsInputSchema, type PatientImportRow } from "@/lib/patient-import.shared";

export type BulkImportResult = {
  ok: boolean;
  imported: number;
  skippedDuplicates: string[];
  error?: string;
};

const CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export const bulkImportPatients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bulkImportPatientsInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<BulkImportResult> => {
    const { supabase, userId } = context;
    if (!(await assertAdmin(supabase, userId))) {
      return { ok: false, imported: 0, skippedDuplicates: [], error: "Admins only." };
    }

    const rows = data.rows as PatientImportRow[];
    const hns = rows.map((r) => r.hn).filter((hn): hn is string => Boolean(hn));

    let existingHns = new Set<string>();
    if (hns.length > 0) {
      const { data: existing, error } = await supabase.from("patients").select("hn").in("hn", hns);
      if (error) {
        return {
          ok: false,
          imported: 0,
          skippedDuplicates: [],
          error: "Could not check for existing HNs.",
        };
      }
      existingHns = new Set((existing ?? []).map((r) => r.hn as string));
    }

    const skippedDuplicates = [...new Set(hns.filter((hn) => existingHns.has(hn)))];
    const toInsert = rows.filter((r) => !r.hn || !existingHns.has(r.hn));

    let imported = 0;
    for (const batch of chunk(toInsert, CHUNK_SIZE)) {
      if (batch.length === 0) continue;
      const { error, count } = await supabase.from("patients").insert(batch, { count: "exact" });
      if (error) {
        return {
          ok: imported > 0,
          imported,
          skippedDuplicates,
          error: `Import stopped after ${imported} row(s): ${error.message}`,
        };
      }
      imported += count ?? batch.length;
    }

    return { ok: true, imported, skippedDuplicates };
  });
