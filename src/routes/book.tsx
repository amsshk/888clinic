import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, Clock, Loader2, MapPin, Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitEnquiry } from "@/lib/enquiries.functions";
import { CLINIC } from "@/lib/clinic";
import { toast } from "sonner";
import { useLang, type TKey } from "@/lib/i18n";
import { useContactIdentity } from "@/hooks/useContactIdentity";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book an Appointment — 888clinic Dermatology" },
      {
        name: "description",
        content:
          "Choose a date and time for your dermatology appointment at 888clinic. Instant email confirmation of your request.",
      },
      { property: "og:title", content: "Book an Appointment — 888clinic Dermatology" },
      {
        property: "og:description",
        content:
          "Pick an available slot, share your details and we confirm your dermatology visit at 888clinic.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookPage,
});

const SERVICES: { value: string; key: TKey }[] = [
  { value: "Dermatology consultation", key: "bksvc.consult" },
  { value: "Acne programme", key: "bksvc.acne" },
  { value: "Pigmentation & melasma", key: "bksvc.pigment" },
  { value: "Mole / skin cancer check", key: "bksvc.mole" },
  { value: "Botox", key: "bksvc.botox" },
  { value: "Dermal filler", key: "bksvc.filler" },
  { value: "Laser & skin resurfacing", key: "bksvc.laser" },
  { value: "Skincare advice", key: "bksvc.skincare" },
];

/** Clinic opening hours per weekday (0 = Sunday). */
const HOURS: Record<number, { open: number; close: number } | null> = {
  0: { open: 11, close: 20 },
  1: null, // Monday — closed
  2: { open: 11, close: 20 },
  3: { open: 11, close: 20 },
  4: { open: 11, close: 20 },
  5: { open: 11, close: 20 },
  6: { open: 11, close: 20 },
};

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextDays(count: number) {
  const out: Date[] = [];
  const today = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d);
  }
  return out;
}

function slotsFor(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const window = HOURS[d.getDay()];
  if (!window) return [];
  const now = new Date();
  const isToday = toISO(now) === iso;
  const slots: string[] = [];
  for (let h = window.open; h < window.close; h += 1) {
    for (const m of [0, 30]) {
      if (isToday && (h < now.getHours() + 2 || (h === now.getHours() + 2 && m < now.getMinutes()))) continue;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

function BookPage() {
  const { t, lang } = useLang();
  const locale = lang === "th" ? "th-TH" : "en-GB";
  const days = useMemo(() => nextDays(14), []);
  const [date, setDate] = useState<string>(() => {
    const first = nextDays(14).find((d) => slotsFor(toISO(d)).length > 0);
    return first ? toISO(first) : toISO(new Date());
  });
  const [time, setTime] = useState<string>("");
  const [service, setService] = useState<string>((SERVICES[0]?.value ?? ""));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ date: string; time: string } | null>(null);
  const send = useServerFn(submitEnquiry);
  const identity = useContactIdentity();
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    if (!phoneTouched && identity.phone) setPhone(identity.phone);
  }, [identity.phone, phoneTouched]);

  const slots = useMemo(() => slotsFor(date), [date]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!time) {
      toast.error(t("bk.pickTime"));
      return;
    }
    const form = event.currentTarget;
    const fd = new FormData(form);
    const fullName = identity.signedIn
      ? identity.fullName || identity.email
      : String(fd.get("name") ?? "");
    const email = identity.signedIn ? identity.email : String(fd.get("email") ?? "");
    setBusy(true);
    try {
      const result = await send({
        data: {
          fullName,
          phone,
          email,
          concern: String(fd.get("concern") ?? ""),
          preferredDate: date,
          preferredTime: time,
          service,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      void identity.rememberPhone(phone);
      setDone({ date, time });
      form.reset();
      toast.success(t("bk.ok"), {
        description: t("bk.okBody"),
      });

    } catch {
      toast.error(t("bk.fail"), {
        description: t("bk.failBody"),
      });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <h1 className="mt-6 text-4xl leading-tight">{t("bk.done.title")}</h1>
        <p className="mt-4 text-muted-foreground">
          {t("bk.done.body1")}{" "}
          <strong className="text-foreground">
            {new Date(`${done.date}T00:00:00`).toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}{" "}
            {t("bk.at")} {done.time}
          </strong>
          {t("bk.done.body2")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" className="rounded-none">
            <a href={CLINIC.phoneHref}>
              <Phone className="size-4" /> {CLINIC.phone}
            </a>
          </Button>
          <Button asChild className="rounded-none">
            <Link to="/services">{t("bk.done.browse")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="bg-shell">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="eyebrow">{t("bk.eyebrow")}</p>
          <h1 className="mt-4 max-w-2xl text-5xl leading-tight">
            {t("bk.title")}
          </h1>
          <p className="mt-5 max-w-xl text-muted-foreground">
            {t("bk.lede")}
          </p>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
            {CLINIC.branches.map((branch) => (
              <span key={branch.id} className="inline-flex items-center gap-2">
                <MapPin className="size-4" /> {branch.name} · {branch.phone}
              </span>
            ))}
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4" /> {t("bk.hours")}
            </span>
          </div>

        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <form onSubmit={onSubmit} className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-10">
            <div>
              <h2 className="text-2xl">{t("bk.step1")}</h2>
              <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                {days.map((d) => {
                  const iso = toISO(d);
                  const closed = slotsFor(iso).length === 0;
                  const active = iso === date;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={closed}
                      onClick={() => {
                        setDate(iso);
                        setTime("");
                      }}
                      className={`min-w-[4.75rem] border px-3 py-3 text-center transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : closed
                            ? "border-border/60 text-muted-foreground/50"
                            : "border-border hover:border-primary"
                      }`}
                    >
                      <span className="block text-[0.65rem] uppercase tracking-widest">
                        {d.toLocaleDateString(locale, { weekday: "short" })}
                      </span>
                      <span className="mt-1 block text-lg">{d.getDate()}</span>
                      <span className="block text-[0.65rem] uppercase tracking-widest">
                        {d.toLocaleDateString(locale, { month: "short" })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-2xl">{t("bk.step2")}</h2>
              {slots.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {t("bk.noslots")}
                </p>
              ) : (
                <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTime(s)}
                      aria-pressed={time === s}
                      className={`border px-2 py-2.5 text-sm transition-colors ${
                        time === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5 border border-border p-6">
            <h2 className="text-2xl">{t("bk.step3")}</h2>

            {identity.signedIn ? (
              <div className="border border-border/70 bg-shell px-4 py-3 text-sm">
                <p>
                  {t("bk.asYou")}{" "}
                  <strong className="text-foreground">{identity.fullName || identity.email}</strong>
                  {identity.fullName && identity.email ? (
                    <span className="text-muted-foreground"> · {identity.email}</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t("bk.autofill")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="bk-name">{t("bk.name")}</Label>
                <Input id="bk-name" name="name" required maxLength={100} className="rounded-none" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="bk-phone">{t("bk.phone")}</Label>
              <Input
                id="bk-phone"
                name="phone"
                type="tel"
                required
                maxLength={40}
                value={phone}
                onChange={(e) => {
                  setPhoneTouched(true);
                  setPhone(e.target.value);
                }}
                className="rounded-none"
              />
            </div>
            {!identity.signedIn && (
              <div className="space-y-2">
                <Label htmlFor="bk-email">{t("bk.email")}</Label>
                <Input
                  id="bk-email"
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  className="rounded-none"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("bk.treatment")}</Label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder={t("bk.treatment.ph")} />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {SERVICES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {t(s.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-concern">{t("bk.notes")}</Label>
              <Textarea
                id="bk-concern"
                name="concern"
                rows={3}
                maxLength={1000}
                placeholder={t("bk.notes.ph")}
                className="rounded-none"
              />
            </div>

            <div className="border border-border/70 bg-shell px-4 py-3 text-sm">
              {time ? (
                <span>
                  {t("bk.selected")}{" "}
                  <strong>
                    {new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}{" "}
                    {t("bk.at")} {time}
                  </strong>
                </span>
              ) : (
                <span className="text-muted-foreground">{t("bk.notime")}</span>
              )}
            </div>

            <Button type="submit" size="lg" disabled={busy} className="w-full rounded-none">
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarCheck className="size-4" />
              )}
              {busy ? t("bk.sending") : t("bk.submit")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("bk.disclaimer")}{" "}
              <a href={CLINIC.phoneHref} className="underline">
                {CLINIC.phone}
              </a>
              .
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
