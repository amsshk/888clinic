import { z } from "zod";

/** One normalized patient row parsed from pasted spreadsheet/CSV data, ready to import. */
export type PatientImportRow = {
  hn: string | null;
  full_name: string;
  nickname: string | null;
  age: number | null;
  phone: string | null;
  address: string | null;
  first_visit: string | null;
  treatment_notes: string | null;
};

export type PatientImportRowError = {
  /** 1-based line number within the pasted data (header line excluded). */
  line: number;
  message: string;
};

export type ParsedPatientImport = {
  rows: PatientImportRow[];
  errors: PatientImportRowError[];
};

export const patientImportRowSchema = z.object({
  hn: z.string().trim().max(50).nullable(),
  full_name: z.string().trim().min(1).max(200),
  nickname: z.string().trim().max(100).nullable(),
  age: z.number().int().min(0).max(150).nullable(),
  phone: z.string().trim().max(30).nullable(),
  address: z.string().trim().max(500).nullable(),
  first_visit: z.string().trim().max(50).nullable(),
  treatment_notes: z.string().trim().max(5000).nullable(),
});

export const bulkImportPatientsInputSchema = z.object({
  rows: z.array(patientImportRowSchema).min(1).max(2000),
});

/** Header aliases, matched case-insensitively after stripping non-alphanumerics. */
const HEADER_ALIASES: Record<string, keyof PatientImportRow> = {
  hn: "hn",
  hnnumber: "hn",
  patienthn: "hn",
  fullname: "full_name",
  name: "full_name",
  patientname: "full_name",
  nickname: "nickname",
  nick: "nickname",
  age: "age",
  phone: "phone",
  phonenumber: "phone",
  tel: "phone",
  mobile: "phone",
  address: "address",
  firstvisit: "first_visit",
  firstvisitdate: "first_visit",
  visitdate: "first_visit",
  treatmentnotes: "treatment_notes",
  treatmenthistory: "treatment_notes",
  notes: "treatment_notes",
  history: "treatment_notes",
};

function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Splits raw pasted text into rows/cells, handling quoted fields (RFC 4180 style) for both comma- and tab-delimited input. */
export function parseDelimitedText(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = normalized.split("\n", 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

/** Parses pasted CSV/TSV spreadsheet text into normalized patient rows, using the first line as a header. */
export function parsePatientImportText(text: string): ParsedPatientImport {
  const table = parseDelimitedText(text);
  const errors: PatientImportRowError[] = [];

  if (table.length === 0) {
    return { rows: [], errors: [{ line: 0, message: "No data found." }] };
  }

  const header = table[0]?.map(normalizeHeader) ?? [];
  const columnMap: (keyof PatientImportRow | null)[] = header.map((h) => HEADER_ALIASES[h] ?? null);

  if (!columnMap.includes("full_name")) {
    return {
      rows: [],
      errors: [{ line: 0, message: 'Missing a "name" (or "full name") column.' }],
    };
  }

  const rows: PatientImportRow[] = [];

  for (let i = 1; i < table.length; i++) {
    const line = i + 1;
    const cells = table[i] ?? [];
    const record: Partial<Record<keyof PatientImportRow, string>> = {};
    columnMap.forEach((key, idx) => {
      if (key) record[key] = (cells[idx] ?? "").trim();
    });

    const fullName = record["full_name"] ?? "";
    if (!fullName) {
      errors.push({ line, message: "Missing name; row skipped." });
      continue;
    }

    let age: number | null = null;
    const ageRaw = record["age"];
    if (ageRaw) {
      const parsedAge = Number(ageRaw);
      if (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 150) {
        errors.push({ line, message: `Invalid age "${ageRaw}"; row skipped.` });
        continue;
      }
      age = Math.round(parsedAge);
    }

    rows.push({
      hn: record["hn"] || null,
      full_name: fullName,
      nickname: record["nickname"] || null,
      age,
      phone: record["phone"] || null,
      address: record["address"] || null,
      first_visit: record["first_visit"] || null,
      treatment_notes: record["treatment_notes"] || null,
    });
  }

  return { rows, errors };
}
