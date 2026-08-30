/**
 * Face fingerprinting — server only.
 *
 * Every uploaded photo is turned into a face embedding (a numeric signature) and
 * stored against the account. If the same face shows up on a different account,
 * the new account cannot spend a FREE scan: it must subscribe. Paid credits are
 * always honoured, so genuine returning patients are never blocked.
 */

const EMBEDDING_MODEL = "google/gemini-embedding-2";

/** Cosine similarity above which two photos are treated as the same person. */
const MATCH_THRESHOLD = 0.9;

export const DUPLICATE_FACE_MESSAGE =
  "This face is already registered with another 888clinic account. Free scans are one per person — please sign in to your original account, or subscribe on this one to continue.";

export async function embedFace(apiKey: string, dataUrl: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: [{ content: [{ type: "image_url", image_url: { url: dataUrl } }] }],
      }),
    });
    if (!res.ok) {
      console.error("[face-identity] embedding failed", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const json = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const vector = json.data?.[0]?.embedding;
    return Array.isArray(vector) && vector.length ? vector : null;
  } catch (error) {
    console.error("[face-identity] embedding error", error);
    return null;
  }
}

type FaceCheckArgs = {
  apiKey: string;
  userId: string;
  dataUrl: string;
  kind: "scan" | "predict";
  storagePath: string;
  /** True when this run would consume a free (non-paid) scan. */
  usingFreeScan: boolean;
};

export type FaceCheckResult =
  | { blocked: true; message: string }
  | { blocked: false; matchedUserId?: string; similarity?: number };

export async function checkFaceIdentity(args: FaceCheckArgs): Promise<FaceCheckResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const embedding = await embedFace(args.apiKey, args.dataUrl);
  // Never block a paying patient because the embedding service hiccuped.
  if (!embedding) return { blocked: false };

  const literal = `[${embedding.join(",")}]`;

  const { data: match, error } = await supabaseAdmin.rpc("match_face_identity", {
    _embedding: literal,
    _exclude_user: args.userId,
    _threshold: MATCH_THRESHOLD,
  });
  if (error) console.error("[face-identity] match error", error);

  const hit = Array.isArray(match) ? match[0] : null;
  const matchedUserId = hit?.matched_user_id ?? undefined;
  const similarity = hit?.similarity != null ? Number(hit.similarity) : undefined;

  await supabaseAdmin.from("face_identities").insert({
    user_id: args.userId,
    kind: args.kind,
    storage_path: args.storagePath,
    embedding: literal,
    duplicate_of_user_id: matchedUserId ?? null,
    similarity: similarity ?? null,
  });

  if (matchedUserId && args.usingFreeScan) {
    return { blocked: true, message: DUPLICATE_FACE_MESSAGE };
  }

  return { blocked: false, ...(matchedUserId ? { matchedUserId } : {}), ...(similarity != null ? { similarity } : {}) };
}

/** Is the next charge going to be a free scan rather than a paid credit? */
export async function willUseFreeScan(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("scan_wallets")
    .select("free_scans_remaining")
    .eq("user_id", userId)
    .maybeSingle();
  return Number(data?.free_scans_remaining ?? 0) > 0;
}
