import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ScanFace,
  Stethoscope,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Star,
  Bot,
  Syringe,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultsMarquee } from "@/components/site/ResultsMarquee";
import { useLang, type TKey } from "@/lib/i18n";
import heroImg from "@/assets/hero-clinic.jpg";
import drMaliImg from "@/assets/dr-mali-robot.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "888clinic — Dermatology Clinic & Clinical Skincare" },
      {
        name: "description",
        content:
          "888clinic is a modern dermatology clinic offering medical skin care, aesthetic treatments, AI skin analysis and clinical-grade skincare products.",
      },
      {
        property: "og:title",
        content: "888clinic — Dermatology Clinic & Clinical Skincare",
      },
      {
        property: "og:description",
        content:
          "Specialist dermatology, aesthetic treatments and clinical skincare at 888clinic.",
      },
    ],
  }),
  component: Home,
});

const pillars: { icon: typeof Stethoscope; title: TKey; body: TKey }[] = [
  { icon: Stethoscope, title: "home.pillar1.title", body: "home.pillar1.body" },
  { icon: Sparkles, title: "home.pillar2.title", body: "home.pillar2.body" },
  { icon: ScanFace, title: "home.pillar3.title", body: "home.pillar3.body" },
  { icon: ShieldCheck, title: "home.pillar4.title", body: "home.pillar4.body" },
];

const maliCards: { icon: typeof ScanFace; title: TKey; body: TKey }[] = [
  { icon: ScanFace, title: "home.mali.c1.title", body: "home.mali.c1.body" },
  { icon: Syringe, title: "home.mali.c2.title", body: "home.mali.c2.body" },
  { icon: FileText, title: "home.mali.c3.title", body: "home.mali.c3.body" },
];

function Home() {
  const { t } = useLang();
  const stats: [string, TKey][] = [
    ["12k+", "home.stat.patients"],
    ["18", "home.stat.years"],
    ["4.9", "home.stat.rating"],
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-shell">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="eyebrow">{t("home.eyebrow")}</p>
            <h1 className="mt-5 text-5xl leading-[1.05] sm:text-6xl">
              {t("home.title1")}
              <br />
              <span className="text-gradient-gold">{t("home.title2")}</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              {t("home.lede")}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-none px-7">
                <Link to="/contact">
                  {t("home.cta.consult")} <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-none border-gold/60 px-7 hover:bg-accent"
              >
                <Link to="/ai-skin-analysis">{t("home.cta.scan")}</Link>
              </Button>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-7">
              {stats.map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-3xl text-foreground">
                    {value}
                  </dt>
                  <dd className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {t(label)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <img
              src={heroImg}
              alt="Reception area of the 888clinic dermatology clinic"
              width={1600}
              height={1104}
              className="w-full object-cover shadow-soft"
            />
            <div className="absolute -bottom-6 left-6 hidden bg-card px-6 py-5 shadow-soft sm:block">
              <div className="flex items-center gap-1 text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-current" />
                ))}
              </div>
              <p className="mt-2 max-w-[15rem] text-sm text-muted-foreground">
                {t("home.quote")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-xl">
          <p className="eyebrow">{t("home.pillars.eyebrow")}</p>
          <h2 className="mt-4 text-4xl">{t("home.pillars.title")}</h2>
        </div>
        <div className="mt-12 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group bg-card p-7 transition-colors hover:bg-accent/50"
            >
              <Icon className="size-6 text-gold" />
              <h3 className="mt-5 text-xl">{t(title)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(body)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Patient results */}
      <section className="py-20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-5">
          <div className="max-w-xl">
            <p className="eyebrow">{t("home.results.eyebrow")}</p>
            <h2 className="mt-4 text-4xl">{t("home.results.title")}</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {t("home.results.body")}
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-none border-gold/60 px-6 hover:bg-accent">
            <Link to="/results">
              {t("home.results.cta")} <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10">
          <ResultsMarquee />
        </div>
      </section>

      {/* Meet Dr Mali */}
      <section className="border-y border-border bg-shell">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[0.65fr_1fr]">
          <div className="mx-auto w-full max-w-xs lg:max-w-sm">
            <img
              src={drMaliImg}
              alt="Dr Mali, the 888clinic AI dermatology assistant"
              width={1200}
              height={1408}
              loading="lazy"
              className="w-full object-contain"
            />
            <div className="mt-4 flex items-center justify-center gap-2">
              <Bot className="size-4 text-gold" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                DR MALI · AI
              </span>
            </div>
          </div>

          <div>
            <p className="eyebrow">{t("home.mali.eyebrow")}</p>
            <h2 className="mt-4 text-4xl">
              {t("home.mali.title1")}{" "}
              <span className="text-gradient-gold">{t("home.mali.title2")}</span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              {t("home.mali.body")}
            </p>

            <div className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-3">
              {maliCards.map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-card p-5">
                  <Icon className="size-5 text-gold" />
                  <h3 className="mt-4 text-lg">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-none px-7">
                <Link to="/mali" search={{ tool: "before-after" as const }}>
                  {t("home.mali.cta1")} <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-none border-gold/60 px-7 hover:bg-accent"
              >
                <Link to="/results">{t("home.mali.cta2")}</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("home.mali.note")}
            </p>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="bg-secondary/60">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <div>
            <p className="eyebrow">{t("home.products.eyebrow")}</p>
            <h2 className="mt-4 text-4xl">{t("home.products.title")}</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {t("home.products.body")}
            </p>
            <Button asChild size="lg" className="mt-8 rounded-none px-7">
              <Link to="/products">
                {t("home.products.cta")} <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="bg-gradient-gold px-8 py-14 text-center shadow-gold">
          <h2 className="text-4xl text-primary-foreground">
            {t("home.cta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-primary-foreground/85">
            {t("home.cta.body")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="rounded-none px-7"
            >
              <Link to="/contact">{t("cta.book")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="rounded-none px-7 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/services">{t("home.cta.treatments")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
