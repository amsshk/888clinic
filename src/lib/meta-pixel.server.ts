import { createHash } from "node:crypto";

export type MetaPurchaseEventInput = {
  eventId: string;
  amountCents: number;
  currency: string;
  email?: string | null;
  phone?: string | null;
  contentIds?: Array<string | null | undefined>;
  contentType?: string;
};

export type MetaUserData = {
  em?: string;
  ph?: string;
};

export type MetaPurchaseEvent = {
  event_name: "Purchase";
  event_time: number;
  event_id: string;
  action_source: "website";
  custom_data: {
    currency: string;
    value: number;
    content_ids?: string[];
    content_type?: string;
  };
  user_data: MetaUserData;
};

function hashMetaValue(value?: string | null): string | undefined {
  const clean = value?.trim().toLowerCase();
  if (!clean) return undefined;
  return createHash("sha256").update(clean).digest("hex");
}

export function buildMetaPurchaseEvent({
  eventId,
  amountCents,
  currency,
  email,
  phone,
  contentIds,
  contentType,
}: MetaPurchaseEventInput): MetaPurchaseEvent {
  const normalizedContentIds = (contentIds ?? [])
    .filter((id): id is string => Boolean(id && String(id).trim()))
    .map((id) => String(id));

  const userData: MetaUserData = {};
  const emailHash = hashMetaValue(email);
  if (emailHash) userData.em = emailHash;

  const phoneValue = phone?.replace(/\D+/g, "");
  const phoneHash = hashMetaValue(phoneValue);
  if (phoneHash) userData.ph = phoneHash;

  return {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    custom_data: {
      currency,
      value: Number((amountCents / 100).toFixed(2)),
      ...(normalizedContentIds.length > 0 ? { content_ids: normalizedContentIds } : {}),
      ...(contentType ? { content_type: contentType } : {}),
    },
    user_data: userData,
  };
}

export async function sendMetaPurchaseEvent(
  input: MetaPurchaseEventInput,
): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  if (process.env["META_CONVERSIONS_API_ENABLED"] !== "true") {
    return { ok: false, skipped: true, reason: "Meta Conversions API is disabled." };
  }
  const pixelId = process.env["META_PIXEL_ID"] || "1437834427873532";
  const accessToken = process.env["META_CONVERSIONS_API_TOKEN"];

  if (!accessToken) {
    return { ok: false, skipped: true, reason: "META_CONVERSIONS_API_TOKEN is not configured." };
  }

  const payload = {
    data: [buildMetaPurchaseEvent(input)],
  };

  const url = `https://graph.facebook.com/v22.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Meta Pixel purchase event rejected: ${response.status} ${text}`);
  }

  return { ok: true };
}
