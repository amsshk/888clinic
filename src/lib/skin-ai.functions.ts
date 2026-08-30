import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { base64Encode } from "@/lib/base64";

export type ScanFinding = { label: string; detail: string };

export type ScanResult = {
  id: string;
  condition: string;
  confidence: number;
  severity: string;
  urgency: string;
  summary: string;
  findings: ScanFinding[];
  recommendations: string[];
  created_at: string;
  mali?: MaliSecondOpinion | null;
};

export type MaliSecondOpinion = {
  melanoma: number;
  nevus?: number;
  seborrheicKeratosis: number;
  modelVersion: string;
  primary?: boolean;
};

export type Wallet = { free_scans_remaining: number; credits: number };

export const getScanAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: wallet }, { data: scans }] = await Promise.all([
      supabase
        .from("scan_wallets")
        .select("free_scans_remaining, credits")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("skin_scans")
        .select(
          "id, condition, confidence, severity, urgency, summary, findings, recommendations, created_at, body_area, concern, mali_melanoma_prob, mali_nevus_prob, mali_sk_prob, mali_model_version, mali_primary",
        )
        .eq("user_id", userId)
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    return {
      wallet: (wallet ?? { free_scans_remaining: 0, credits: 0 }) as Wallet,
      scans: (scans ?? []).map((row) => ({
        id: row.id,
        condition: row.condition ?? "Unclear finding",
        confidence: Number(row.confidence ?? 0),
        severity: row.severity ?? "unknown",
        urgency: row.urgency ?? "routine",
        summary: row.summary ?? "",
        findings: (row.findings as ScanFinding[] | null) ?? [],
        recommendations: (row.recommendations as string[] | null) ?? [],
        created_at: row.created_at,
        body_area: row.body_area ?? "",
        concern: row.concern ?? "",
        mali:
          row.mali_model_version != null
            ? {
                melanoma: Number(row.mali_melanoma_prob ?? 0),
                nevus: Number(row.mali_nevus_prob ?? 0),
                seborrheicKeratosis: Number(row.mali_sk_prob ?? 0),
                modelVersion: row.mali_model_version,
                primary: Boolean(row.mali_primary),
              }
            : null,
      })),
    };
  });

export const analyzeSkinScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      storagePath: string;
      bodyArea: string;
      concern: string;
      lang?: string;
      mali?: { melanoma: number; nevus: number; seborrheicKeratosis: number; modelVersion: string } | null;
    }) => {
      const storagePath = String(input.storagePath ?? "").trim();
      if (!storagePath) throw new Error("Missing image");
      const mali = input.mali
        ? {
            melanoma: Number(input.mali.melanoma),
            nevus: Number(input.mali.nevus),
            seborrheicKeratosis: Number(input.mali.seborrheicKeratosis),
            modelVersion: String(input.mali.modelVersion ?? "").slice(0, 60),
          }
        : null;
      return {
        storagePath,
        bodyArea: String(input.bodyArea ?? "").slice(0, 80),
        concern: String(input.concern ?? "").slice(0, 500),
        lang: input.lang === "th" ? ("th" as const) : ("en" as const),
        mali,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    if (!data.storagePath.startsWith(`${userId}/`)) {
      return { ok: false as const, error: data.lang === "th" ? "รูปนี้ไม่ได้อยู่ในบัญชีของคุณค่ะ" : "That image does not belong to your account." };
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: data.lang === "th" ? "ระบบ AI ยังไม่พร้อมใช้งานค่ะ" : "AI is not configured yet." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Read the photo BEFORE charging so the identity check can run first.
    const file = await supabaseAdmin.storage.from("scans").download(data.storagePath);
    if (file.error || !file.data) {
      return { ok: false as const, error: data.lang === "th" ? "ระบบอ่านรูปนี้ไม่ได้ กรุณาอัปโหลดใหม่อีกครั้งค่ะ" : "We could not read that image. Please upload it again." };
    }
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    if (bytes.byteLength > 8_000_000) {
      return { ok: false as const, error: data.lang === "th" ? "รูปมีขนาดใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน 8 MB ค่ะ" : "Image is too large — please upload one under 8MB." };
    }
    const dataUrl = `data:${file.data.type || "image/jpeg"};base64,${base64Encode(bytes)}`;

    const { checkFaceIdentity, willUseFreeScan } = await import("@/lib/face-identity.server");
    const usingFreeScan = await willUseFreeScan(userId);
    const identity = await checkFaceIdentity({
      apiKey,
      userId,
      dataUrl,
      kind: "scan",
      storagePath: data.storagePath,
      usingFreeScan,
    });
    if (identity.blocked) {
      return { ok: false as const, error: identity.message, duplicateFace: true, needsCredits: true };
    }

    const { data: charged, error: chargeError } = await supabaseAdmin.rpc("consume_scan_credit", {
      _user_id: userId,
    });
    if (chargeError) {
      console.error("[skin-ai] credit error", chargeError);
      return { ok: false as const, error: data.lang === "th" ? "ตรวจสอบเครดิตไม่ได้ กรุณาลองใหม่อีกครั้งค่ะ" : "Could not check your scan balance. Please try again." };
    }
    if (!charged) {
      return { ok: false as const, error: "no_credits", needsCredits: true };
    }

    const refund = async () => {
      await supabaseAdmin.rpc("refund_scan_credit", { _user_id: userId, _kind: charged });
    };

    try {
      // ---- MALI is the primary reader (shared pipeline) --------------------
      const { runScanPipeline } = await import("@/lib/scan-pipeline.server");
      const outcome = await runScanPipeline({
        apiKey,
        dataUrl,
        bodyArea: data.bodyArea,
        concern: data.concern,
        lang: data.lang,
        clientMali: data.mali,
      });

      if (!outcome.ok) {
        await refund();
        return { ok: false as const, error: `${outcome.error} ${data.lang === "th" ? "ระบบไม่ได้หักสิทธิ์สแกนของคุณค่ะ" : "Your scan was not deducted."}` };
      }

      const { probs, modelVersion, findings, recommendations } = outcome;

      const row = {
        user_id: userId,
        storage_path: data.storagePath,
        body_area: data.bodyArea || null,
        concern: data.concern || null,
        status: "complete" as const,
        condition: outcome.condition,
        confidence: outcome.confidence,
        severity: outcome.severity,
        urgency: outcome.urgency,
        mali_melanoma_prob: probs ? probs.melanoma : null,
        mali_nevus_prob: probs ? probs.nevus : null,
        mali_sk_prob: probs ? probs.seborrheicKeratosis : null,
        mali_model_version: modelVersion,
        mali_primary: outcome.maliPrimary,
        summary: outcome.summary,
        findings,
        recommendations,
        charged,
      };


      const inserted = await supabaseAdmin
        .from("skin_scans")
        .insert(row)
        .select("id, created_at")
        .single();

      if (inserted.error || !inserted.data) {
        console.error("[skin-ai] insert error", inserted.error);
        await refund();
        return { ok: false as const, error: data.lang === "th" ? "บันทึกรายงานไม่ได้ กรุณาลองใหม่อีกครั้งค่ะ" : "We could not save your report. Please try again." };
      }

      const { data: wallet } = await supabaseAdmin
        .from("scan_wallets")
        .select("free_scans_remaining, credits")
        .eq("user_id", userId)
        .maybeSingle();

      return {
        ok: true as const,
        scan: {
          id: inserted.data.id,
          created_at: inserted.data.created_at,
          condition: row.condition,
          confidence: row.confidence,
          severity: row.severity,
          urgency: row.urgency,
          summary: row.summary,
          findings,
          recommendations,
          body_area: data.bodyArea,
          concern: data.concern,
          mali:
            probs && modelVersion
              ? {
                  melanoma: probs.melanoma,
                  nevus: probs.nevus,
                  seborrheicKeratosis: probs.seborrheicKeratosis,
                  modelVersion,
                  primary: true,
                }
              : null,
        },
        wallet: (wallet ?? { free_scans_remaining: 0, credits: 0 }) as Wallet,
        charged,
      };
    } catch (error) {
      console.error("[skin-ai] unexpected", error);
      await refund();
      return { ok: false as const, error: data.lang === "th" ? "เกิดข้อผิดพลาด ระบบไม่ได้หักสิทธิ์สแกนของคุณ กรุณาลองใหม่ค่ะ" : "Something went wrong. Your scan was not deducted." };
    }
  });
