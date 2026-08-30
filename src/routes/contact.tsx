import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Phone, Mail, Clock, Loader2, MessageCircle, Facebook, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitEnquiry } from "@/lib/enquiries.functions";
import { CLINIC } from "@/lib/clinic";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";


export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Book a Visit — 888clinic Dermatology" },
      {
        name: "description",
        content:
          "Book a dermatology consultation at 888clinic. Clinic address, opening hours and appointment request form.",
      },
      {
        property: "og:title",
        content: "Book a Visit — 888clinic Dermatology",
      },
      {
        property: "og:description",
        content:
          "Request a dermatology appointment at 888clinic — address, hours and contact details.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { t, lang } = useLang();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = useServerFn(submitEnquiry);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    try {
      const result = await send({
        data: {
          fullName: String(fd.get("name") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          email: String(fd.get("email") ?? ""),
          concern: String(fd.get("concern") ?? ""),
          preferredDate: String(fd.get("preferredDate") ?? ""),
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSent(true);
      toast.success(t("con.toast.ok"), {
        description: t("con.toast.okBody"),
      });
      form.reset();
    } catch {
      toast.error(t("con.toast.fail"), {
        description: t("con.toast.failBody"),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <section className="bg-shell">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="eyebrow">{t("con.eyebrow")}</p>
          <h1 className="mt-4 text-5xl leading-tight">
            {t("con.title1")} <span className="text-gradient-gold">{t("con.title2")}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            {t("con.lede")}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <form className="space-y-5 border border-border bg-card p-8" onSubmit={onSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t("con.name")}</Label>
              <Input id="name" name="name" required maxLength={100} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("con.phone")}</Label>
              <Input id="phone" name="phone" type="tel" required maxLength={40} className="rounded-none" />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">{t("con.email")}</Label>
              <Input id="email" name="email" type="email" required maxLength={255} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredDate">{t("con.date")}</Label>
              <Input id="preferredDate" name="preferredDate" type="date" className="rounded-none" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="concern">{t("con.concern")}</Label>
            <Textarea
              id="concern"
              name="concern"
              rows={5}
              maxLength={1000}
              placeholder={t("con.concern.ph")}
              className="rounded-none"
            />
          </div>
          <Button type="submit" size="lg" disabled={busy} className="w-full rounded-none">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? t("con.sending") : t("con.submit")}
          </Button>
          {sent && <p className="text-xs text-gold-deep">{t("con.sent")}</p>}

          <p className="text-xs text-muted-foreground">{t("con.disclaimer")}</p>
        </form>

        <aside className="space-y-8">
          <div className="space-y-px border border-border bg-border">
            {CLINIC.branches.map((branch) => (
              <div key={branch.id} className="bg-card p-6">
                <MapPin className="size-5 text-gold" />
                <h2 className="mt-3 text-lg">
                  {lang === "th" ? branch.nameTh : branch.name}
                </h2>
                <a
                  href={branch.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sm leading-relaxed text-muted-foreground hover:text-foreground"
                >
                  {lang === "th" ? branch.addressTh : branch.address}
                </a>
                <a
                  href={branch.phoneHref}
                  className="mt-2 flex items-center gap-2 text-sm text-gold-deep hover:underline"
                >
                  <Phone className="size-4" /> {branch.phone}
                </a>
              </div>
            ))}
            {[
              { icon: Mail, title: t("con.email"), body: CLINIC.email, href: `mailto:${CLINIC.email}` },
              {
                icon: Clock,
                title: t("con.hours"),
                body: t("con.hours.body"),
              },
            ].map(({ icon: Icon, title, body, href }) => (
              <div key={title} className="bg-card p-6">
                <Icon className="size-5 text-gold" />
                <h2 className="mt-3 text-lg">{title}</h2>
                {href ? (
                  <a
                    href={href}
                    className="mt-1 block text-sm leading-relaxed text-muted-foreground hover:text-foreground"
                  >
                    {body}
                  </a>
                ) : (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                )}
              </div>
            ))}
          </div>


          <div className="border border-border bg-card p-6">
            <h2 className="text-lg">{t("con.follow")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("con.follow.body")}</p>
            <div className="mt-5 grid gap-px bg-border">
              {[
                { icon: MessageCircle, label: "LINE — Srinakarin", href: "https://lin.ee/UrwMF4W" },
                { icon: MessageCircle, label: "LINE — Nakhon Pathom", href: "https://lin.ee/NpQGT7h" },
                { icon: Facebook, label: "Facebook — 888 Clinic", href: CLINIC.socials.facebook },
                { icon: Music2, label: "TikTok — @888clinic", href: CLINIC.socials.tiktok },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                >
                  <Icon className="size-4 text-gold" /> {label}
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="eyebrow">{t("con.loc.eyebrow")}</p>
          <h2 className="mt-4 text-3xl">{t("con.loc.title")}</h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {CLINIC.branches.map((branch) => (
              <div key={branch.id}>
                <h3 className="text-lg">{lang === "th" ? branch.nameTh : branch.name}</h3>
                <div className="mt-3 border border-border bg-card p-2">
                  <iframe
                    title={`888clinic ${branch.name} map`}
                    src={branch.mapsEmbed}
                    loading="lazy"
                    className="h-[20rem] w-full border-0"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <a href={branch.phoneHref} className="text-gold-deep hover:underline">
                    {branch.phone}
                  </a>
                  <a
                    href={branch.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gold-deep hover:underline"
                  >
                    {t("con.maps")}
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  );
}
