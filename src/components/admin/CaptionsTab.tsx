import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Clipboard, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  checkCaption,
  generateCaptions,
  type CaptionIssue,
  type CaptionOption,
} from "@/lib/captions.functions";

const PLATFORMS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "line", label: "LINE" },
  { id: "ad", label: "Meta ad" },
] as const;

const TONES = [
  { id: "warm", label: "อบอุ่น · Warm" },
  { id: "premium", label: "หรูหรา · Premium" },
  { id: "friendly", label: "เป็นกันเอง · Friendly" },
  { id: "short", label: "สั้น · Short" },
] as const;

function Chips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`border px-3 py-1.5 text-xs ${
            value === item.id ? "border-gold bg-gold text-foreground" : "border-border/70 text-muted-foreground"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-none"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check className="size-4" /> : <Clipboard className="size-4" />} {done ? "Copied" : "Copy"}
    </Button>
  );
}

export function CaptionsTab() {
  const generate = useServerFn(generateCaptions);
  const check = useServerFn(checkCaption);

  const [topic, setTopic] = useState("");
  const [offer, setOffer] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>("facebook");
  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>("warm");
  const [options, setOptions] = useState<CaptionOption[]>([]);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);
  const [review, setReview] = useState<{ verdict: string; issues: CaptionIssue[]; rewrite: string } | null>(null);

  async function onGenerate() {
    if (topic.trim().length < 2) return toast.error("Write the treatment or topic first");
    setBusy(true);
    try {
      const res = await generate({ data: { topic, offer, platform, tone } });
      if (!res.ok) toast.error(res.error);
      else setOptions(res.options);
    } catch {
      toast.error("Could not write captions. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onCheck() {
    if (draft.trim().length < 2) return toast.error("Paste a caption first");
    setChecking(true);
    try {
      const res = await check({ data: { caption: draft } });
      if (!res.ok) toast.error(res.error);
      else setReview(res);
    } catch {
      toast.error("Could not check the caption. Try again.");
    } finally {
      setChecking(false);
    }
  }

  const verdictLabel: Record<string, string> = {
    ok: "ผ่าน · Safe to post",
    risky: "เสี่ยง · Change the marked phrases",
    reject: "ไม่ผ่าน · Likely rejected by Meta",
  };

  return (
    <div className="space-y-8">
      <section className="border border-border/70 bg-card p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-gold" />
          <h2 className="font-serif text-2xl">เขียนแคปชัน · Write captions</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Three Thai options in the clinic's voice, already following Meta's rules and Thai rules for clinic
          advertising.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>หัตถการ / หัวข้อ · Treatment or topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="เช่น ร้อยไหมกอร์นาโด 5 ตำแหน่ง" />
          </div>
          <div className="space-y-2">
            <Label>โปรโมชัน (ถ้ามี) · Offer, exactly as it is</Label>
            <Input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="เช่น มัดจำ 1,000 จ่ายที่คลินิก 2,999" />
          </div>
          <div className="space-y-2">
            <Label>ลงที่ · Where</Label>
            <Chips items={PLATFORMS} value={platform} onChange={setPlatform} />
          </div>
          <div className="space-y-2">
            <Label>โทน · Tone</Label>
            <Chips items={TONES} value={tone} onChange={setTone} />
          </div>
        </div>
        <Button className="mt-6 rounded-none" onClick={onGenerate} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Write 3 captions
        </Button>

        {options.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {options.map((o, i) => {
              const full = `${o.text}\n\n${o.hashtags.join(" ")}`.trim();
              return (
                <article key={i} className="flex flex-col border border-border/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-gold">{o.angle}</p>
                  <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-relaxed">{o.text}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{o.hashtags.join(" ")}</p>
                  <div className="mt-4 flex gap-2">
                    <CopyButton text={full} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-none"
                      onClick={() => {
                        setDraft(full);
                        setReview(null);
                      }}
                    >
                      Edit &amp; check
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="border border-border/70 bg-card p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-gold" />
          <h2 className="font-serif text-2xl">ตรวจแคปชัน · Check a caption</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste any caption before posting or boosting. Phrases that get ads rejected (talking about the reader's
          problem, promised results, before/after, "best") are marked, with a safe version.
        </p>
        <Textarea
          className="mt-4 min-h-36"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setReview(null);
          }}
          placeholder="วางแคปชันที่นี่"
        />
        <Button className="mt-4 rounded-none" onClick={onCheck} disabled={checking}>
          {checking ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Check
        </Button>

        {review && (
          <div className="mt-6 space-y-4">
            <p
              className={`inline-block border px-3 py-1 text-sm ${
                review.verdict === "ok"
                  ? "border-emerald-500/60 text-emerald-600"
                  : review.verdict === "reject"
                    ? "border-red-500/60 text-red-600"
                    : "border-amber-500/60 text-amber-600"
              }`}
            >
              {verdictLabel[review.verdict] ?? review.verdict}
            </p>
            {review.issues.length > 0 && (
              <ul className="space-y-3">
                {review.issues.map((issue, i) => (
                  <li key={i} className="border-l-2 border-amber-500/70 pl-3 text-sm">
                    <p>
                      <span className="bg-amber-500/15 px-1">{issue.phrase}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{issue.rule}</p>
                    <p className="mt-1">→ {issue.fix}</p>
                  </li>
                ))}
              </ul>
            )}
            {review.rewrite && review.verdict !== "ok" && (
              <div className="border border-border/70 p-4">
                <p className="text-xs uppercase tracking-wide text-gold">Safe version</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{review.rewrite}</p>
                <div className="mt-3">
                  <CopyButton text={review.rewrite} />
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
