import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LineAutoPanel } from "@/components/admin/LineAutoPanel";
import { getLineStatus, sendLineBroadcast, type LineStatus } from "@/lib/line-broadcast.functions";

export function LineBroadcastTab() {
  const status = useServerFn(getLineStatus);
  const send = useServerFn(sendLineBroadcast);

  const [info, setInfo] = useState<LineStatus | null>(null);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [retryKey, setRetryKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    status()
      .then(setInfo)
      .catch(() => setInfo({ configured: false, quota: null, used: null, friends: null, error: "Could not reach LINE" }));
  }, [status]);

  const left = info?.quota != null && info.used != null ? info.quota - info.used : null;
  const cost = info?.friends ?? null;

  async function onSend() {
    setSending(true);
    try {
      const res = await send({ data: { text, imageUrl, retryKey, confirm: true } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Sent to all LINE friends");
      setText("");
      setImageUrl("");
      setConfirming(false);
      setRetryKey(crypto.randomUUID()); // next message gets a new key
      status().then(setInfo).catch(() => undefined);
    } catch {
      toast.error("Sending failed. Nothing was sent twice; you can try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <LineAutoPanel />
      <section className="border border-border/70 bg-card p-6">
        <div className="flex items-center gap-2">
          <Send className="size-5 text-gold" />
          <h2 className="font-serif text-2xl">ส่งเอง · Send your own message</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          One message to every friend of @8888clinic. Write it in the Captions tab first (choose "LINE"), then
          paste it here.
        </p>

        {!info ? (
          <Loader2 className="mt-6 size-5 animate-spin text-gold" />
        ) : !info.configured ? (
          <div className="mt-6 border border-amber-500/60 p-4 text-sm">
            LINE is not connected yet. In the LINE Developers console open the @8888clinic Messaging API channel,
            issue a <b>channel access token (long-lived)</b>, and save it as the server secret{" "}
            <code>LINE_CHANNEL_ACCESS_TOKEN</code>.
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="border border-border/70 p-4">
              <p className="text-2xl">{info.friends?.toLocaleString() ?? "–"}</p>
              <p className="text-xs text-muted-foreground">เพื่อนที่ได้รับ · friends reached</p>
            </div>
            <div className="border border-border/70 p-4">
              <p className="text-2xl">{left != null ? left.toLocaleString() : "unlimited"}</p>
              <p className="text-xs text-muted-foreground">ข้อความที่เหลือเดือนนี้ · messages left this month</p>
            </div>
            <div className="border border-border/70 p-4">
              <p className="text-2xl">{cost?.toLocaleString() ?? "–"}</p>
              <p className="text-xs text-muted-foreground">ใช้ต่อการส่ง 1 ครั้ง · used per broadcast</p>
            </div>
            {info.error && <p className="text-sm text-red-600 sm:col-span-3">{info.error}</p>}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>ข้อความ · Message</Label>
            <Textarea
              className="min-h-40"
              value={text}
              maxLength={5000}
              onChange={(e) => {
                setText(e.target.value);
                setConfirming(false);
              }}
              placeholder="สวัสดีค่ะ คุณลูกค้า 888 Clinic …"
            />
          </div>
          <div className="space-y-2">
            <Label>รูป (ไม่บังคับ) · Image link, optional (https, JPG/PNG)</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        {left != null && cost != null && cost > left && (
          <p className="mt-4 text-sm text-red-600">
            Not enough messages left this month for everyone ({cost.toLocaleString()} needed, {left.toLocaleString()} left).
          </p>
        )}

        {!confirming ? (
          <Button
            className="mt-6 rounded-none"
            disabled={!info?.configured || text.trim().length < 2}
            onClick={() => setConfirming(true)}
          >
            Review &amp; send
          </Button>
        ) : (
          <div className="mt-6 border border-gold/60 p-4">
            <p className="text-sm">
              This goes to <b>all {info?.friends?.toLocaleString() ?? ""} LINE friends</b> right now and cannot be
              taken back.
            </p>
            <div className="mt-4 flex gap-3">
              <Button className="rounded-none" onClick={onSend} disabled={sending}>
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send now
              </Button>
              <Button variant="outline" className="rounded-none" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
