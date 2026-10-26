import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Plus, Send, Smartphone, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getVideoTicket } from "@/lib/video-enhance.functions";

/*
 * Automatic LINE broadcasts. The schedule and the AI run on the clinic's engine server
 * (pro.888clinic.co), which needs a server that is always on; this panel only controls it,
 * with the same 2-hour staff ticket the video enhancer uses. Prices only come from the
 * offer list below: a draft with any other price is thrown away by the engine.
 */

type Offer = {
  id: number;
  treatment: string;
  price: number;
  normal: number | null;
  until: string | null;
  note: string | null;
};
type Hist = {
  id: number;
  created_at: string;
  kind: string;
  status: string;
  reason: string | null;
  recipients: number | null;
  text: string;
};
type Status = {
  enabled: boolean;
  auto: boolean;
  every: number;
  hour: number;
  next: string;
  test_ready: boolean;
  quota: { limit: number | null; used: number; left: number | null } | null;
  reach: number | null;
  history: Hist[];
  offers: Offer[];
  error?: string;
};
type Draft = { draft: string; text: string; image: string; headline: string };

const WHY: Record<string, string> = {
  no_offers: "ข้าม: ไม่มีโปรในรายการ · skipped, no offers",
  unknown_prices: "ข้าม: AI ใส่ราคาที่ไม่มีในรายการ · skipped, unknown price",
  quota: "ข้าม: โควตาไม่พอ · skipped, not enough quota",
  no_follower_count: "ข้าม: LINE ยังไม่มีจำนวนผู้ติดตาม · skipped, no follower count yet",
};
const KIND: Record<string, string> = {
  auto: "อัตโนมัติ · auto",
  manual: "ส่งเอง · manual",
  test: "ทดสอบ · test",
};
const baht = (v: number | null) => (v == null ? "" : `฿${v.toLocaleString()}`);

export function LineAutoPanel() {
  const ticketFn = useServerFn(getVideoTicket);
  const [ticket, setTicket] = useState<{ base: string; token: string; expiresAt: number } | null>(
    null,
  );
  const [st, setSt] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ reach: number | null; left: number | null } | null>(
    null,
  );
  const [offer, setOffer] = useState({ treatment: "", price: "", normal: "", until: "" });

  const ensureTicket = useCallback(async () => {
    if (ticket && ticket.expiresAt - Date.now() / 1000 > 300) return ticket;
    const res = await ticketFn();
    if (!res.ok) throw new Error(res.error);
    const next = { base: res.base, token: res.token, expiresAt: res.expiresAt };
    setTicket(next);
    return next;
  }, [ticket, ticketFn]);

  const call = useCallback(
    async <T,>(path: string, body?: unknown): Promise<T> => {
      const t = await ensureTicket();
      const res = await fetch(`${t.base}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${t.token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const j = (await res.json().catch(() => ({}))) as { detail?: string };
      if (res.status === 401)
        throw new Error(
          "The engine rejected the pass (VIDEO_SHARED_SECRET differs between the site and the server).",
        );
      if (!res.ok) throw new Error(j.detail ?? `engine answered ${res.status}`);
      return j as T;
    },
    [ensureTicket],
  );

  const load = useCallback(async () => {
    try {
      setSt(await call<Status>("/api/line"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [call]);

  useEffect(() => {
    load();
    // load once on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const toggle = (on: boolean) =>
    run("auto", async () => {
      await call("/api/line/auto", { on });
      await load();
      toast.success(on ? "ส่งอัตโนมัติ: เปิด · Automatic ON" : "ส่งอัตโนมัติ: ปิด · Automatic OFF");
    });

  const addOffer = () =>
    run("offer", async () => {
      await call("/api/line/offers", {
        treatment: offer.treatment,
        price: Number(offer.price),
        normal: offer.normal ? Number(offer.normal) : null,
        until: offer.until || null,
      });
      setOffer({ treatment: "", price: "", normal: "", until: "" });
      await load();
    });

  const removeOffer = (id: number) =>
    run(`del${id}`, async () => {
      await call(`/api/line/offers/${id}/delete`, {});
      await load();
    });

  const make = () =>
    run("make", async () => {
      const d = await call<Draft>("/api/line/make", {});
      setDraft(d);
      setText(d.text);
      setConfirm(null);
    });

  const sendTest = () =>
    run("test", async () => {
      await call("/api/line/send", { draft: draft?.draft, text, test: true });
      toast.success("ส่งหาคุณแล้ว · Sent to your LINE");
      await load();
    });

  const sendAll = () =>
    run("all", async () => {
      if (!confirm) {
        const j = await call<{ reach: number | null; quota: { left: number | null } }>(
          "/api/line/send",
          { draft: draft?.draft, text },
        );
        setConfirm({ reach: j.reach, left: j.quota?.left ?? null });
        return;
      }
      await call("/api/line/send", { draft: draft?.draft, text, confirm: true });
      toast.success("ส่งถึงผู้ติดตามทั้งหมดแล้ว · Sent to all followers");
      setDraft(null);
      setConfirm(null);
      await load();
    });

  const left = st?.quota
    ? st.quota.left == null
      ? "ไม่จำกัด · unlimited"
      : st.quota.left.toLocaleString()
    : "–";

  return (
    <section className="border border-gold/50 bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-gold" />
          <h2 className="font-serif text-2xl">ส่งอัตโนมัติ · Automatic broadcast</h2>
        </div>
        {st?.enabled && (
          <label className="flex items-center gap-3 text-sm">
            {st.auto ? "เปิด · ON" : "ปิด · OFF"}
            <Switch checked={st.auto} disabled={busy === "auto"} onCheckedChange={toggle} />
          </label>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        AI writes a broadcast with a gold poster from the offers below and sends it to every
        follower. Prices only come from this list; a draft with any other price is thrown away. It
        never sends twice within the schedule and stops if the monthly quota can't cover everyone.
      </p>

      {error ? (
        <div className="mt-6 border border-amber-500/60 p-4 text-sm">{error}</div>
      ) : !st ? (
        <Loader2 className="mt-6 size-5 animate-spin text-gold" />
      ) : !st.enabled ? (
        <div className="mt-6 border border-amber-500/60 p-4 text-sm">
          The engine has no LINE token yet. On the server add <code>LINE_TOKEN</code> to{" "}
          <code>/opt/engine/.env</code> and restart the engine.
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="border border-border/70 p-4">
              <p className="text-lg">{st.auto ? st.next || "–" : "ปิดอยู่ · off"}</p>
              <p className="text-xs text-muted-foreground">
                ครั้งถัดไป · next send (every {st.every} days, {st.hour}:00 Thai time)
              </p>
            </div>
            <div className="border border-border/70 p-4">
              <p className="text-2xl">{st.reach?.toLocaleString() ?? "–"}</p>
              <p className="text-xs text-muted-foreground">
                ผู้ติดตามที่ได้รับ · followers reached
              </p>
            </div>
            <div className="border border-border/70 p-4">
              <p className="text-2xl">{left}</p>
              <p className="text-xs text-muted-foreground">
                โควตาเหลือเดือนนี้ · quota left this month
              </p>
            </div>
            {st.error && <p className="text-sm text-red-600 sm:col-span-3">{st.error}</p>}
          </div>

          <h3 className="mt-8 font-serif text-xl">โปรที่ใช้ได้ · Offers it may use</h3>
          {st.offers.length === 0 && (
            <p className="mt-2 text-sm text-red-600">
              ยังไม่มีโปร ระบบจะไม่ส่งจนกว่าจะเพิ่ม · No offers yet: nothing is sent until you add
              one.
            </p>
          )}
          <ul className="mt-3 divide-y divide-border/70 border border-border/70">
            {st.offers.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span>
                  {o.treatment} · <b>{baht(o.price)}</b>
                  {o.normal ? <s className="ml-2 text-muted-foreground">{baht(o.normal)}</s> : null}
                  {o.until ? (
                    <span className="ml-2 text-muted-foreground">ถึง {o.until}</span>
                  ) : null}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === `del${o.id}`}
                  onClick={() => removeOffer(o.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <Input
              placeholder="ทรีตเมนต์ · treatment"
              value={offer.treatment}
              onChange={(e) => setOffer({ ...offer, treatment: e.target.value })}
            />
            <Input
              placeholder="ราคาโปร · price"
              inputMode="numeric"
              value={offer.price}
              onChange={(e) => setOffer({ ...offer, price: e.target.value })}
            />
            <Input
              placeholder="ราคาปกติ · normal"
              inputMode="numeric"
              value={offer.normal}
              onChange={(e) => setOffer({ ...offer, normal: e.target.value })}
            />
            <Input
              type="date"
              value={offer.until}
              onChange={(e) => setOffer({ ...offer, until: e.target.value })}
            />
            <Button
              className="rounded-none"
              disabled={
                busy === "offer" || offer.treatment.trim().length < 2 || !Number(offer.price)
              }
              onClick={addOffer}
            >
              <Plus className="size-4" /> เพิ่ม
            </Button>
          </div>

          <h3 className="mt-8 font-serif text-xl">ตัวอย่าง · Preview</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Writes one exactly like the automatic one. Nothing is sent until you press a send
            button.
          </p>
          <Button
            className="mt-3 rounded-none"
            disabled={busy === "make" || st.offers.length === 0}
            onClick={make}
          >
            {busy === "make" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {busy === "make" ? "กำลังเขียน… ~30 s" : "เขียนตัวอย่างตอนนี้ · Write one now"}
          </Button>
          {draft && (
            <div className="mt-4 grid gap-4 md:grid-cols-[280px_1fr]">
              <img
                src={draft.image}
                alt={draft.headline}
                className="w-full border border-border/70"
              />
              <div className="space-y-3">
                <Textarea
                  className="min-h-64"
                  value={text}
                  maxLength={4900}
                  onChange={(e) => {
                    setText(e.target.value);
                    setConfirm(null);
                  }}
                />
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="rounded-none"
                    disabled={busy === "test" || !st.test_ready}
                    onClick={sendTest}
                  >
                    <Smartphone className="size-4" /> ส่งหาฉัน · Send to me
                  </Button>
                  <Button className="rounded-none" disabled={busy === "all"} onClick={sendAll}>
                    <Send className="size-4" />{" "}
                    {confirm ? "ยืนยันส่ง · Yes, send now" : "ส่งถึงทุกคน · Send to all"}
                  </Button>
                </div>
                {!st.test_ready && (
                  <p className="text-xs text-muted-foreground">
                    Add LINE_ADMIN_ID (your LINE user ID) on the server to use “Send to me”.
                  </p>
                )}
                {confirm && (
                  <p className="border border-gold/60 p-3 text-sm">
                    This goes to <b>{confirm.reach?.toLocaleString() ?? "all"} followers</b> now and
                    cannot be taken back. Quota left:{" "}
                    {confirm.left == null ? "unlimited" : confirm.left.toLocaleString()}. Press the
                    button again to send.
                  </p>
                )}
              </div>
            </div>
          )}

          <h3 className="mt-8 font-serif text-xl">ประวัติ · History</h3>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {st.history.length === 0 && <li>ยังไม่เคยส่ง · nothing sent yet</li>}
            {st.history.map((h) => (
              <li key={h.id}>
                <b className="text-foreground">{h.created_at}</b> · {KIND[h.kind] ?? h.kind} ·{" "}
                {h.status === "skipped"
                  ? (WHY[h.reason ?? ""] ?? h.reason)
                  : h.status === "failed"
                    ? `✕ ${h.reason ?? ""}`
                    : `✓ ${h.recipients != null ? `${h.recipients.toLocaleString()} · ` : ""}${h.text.split("\n")[0]}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
