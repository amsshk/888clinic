import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookingDialog } from "@/components/site/BookingDialog";
import { BEFORE_AFTER, RESULT_CATEGORIES, type ResultCategory } from "@/lib/before-after";
import { ResultsMarquee } from "@/components/site/ResultsMarquee";
import { FeaturedResultsMedia } from "@/components/site/FeaturedResultsMedia";
import { useLang } from "@/lib/i18n";
import { localizeResult, localizeResultCategory } from "@/lib/public-content";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Before & After Results — 888clinic Dermatology" },
      {
        name: "description",
        content:
          "Real patient before and after photos from 888clinic: dermal filler, thread lift, chin, lips, jawline and under-eye treatments. Shared with consent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Before & After Results — 888clinic" },
      {
        property: "og:description",
        content: "Real patient results from filler and thread lift treatments at 888clinic.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<string>("all");

  const items = useMemo(
    () => (filter === "all" ? BEFORE_AFTER : BEFORE_AFTER.filter((i) => i.category === filter)),
    [filter],
  );

  const tabs: Array<"all" | ResultCategory> = ["all", ...RESULT_CATEGORIES];

  return (
    <div>
      <section className="bg-shell">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="eyebrow">{t("res.eyebrow")}</p>
          <h1 className="mt-4 text-5xl leading-tight">
            {t("res.title1")} <span className="text-gradient-gold">{t("res.title2")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t("res.lede")}
          </p>
        </div>

        <div className="mt-4 pb-14">
          <div className="mx-auto mb-5 max-w-6xl px-5">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-gold">
              {t("res.marquee")}
            </p>
          </div>
          <ResultsMarquee />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={
                "border px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] transition-colors " +
                (filter === tab
                  ? "border-gold bg-accent text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {tab === "all" ? t("res.all") : localizeResultCategory(tab, lang)}
            </button>
          ))}
        </div>

        <FeaturedResultsMedia filter={filter} />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const display = localizeResult(item, lang);
            return <figure key={item.id} className="border border-border bg-card">
              <img
                src={item.url}
                alt={display.alt}
                loading="lazy"
                className="aspect-[4/5] w-full bg-shell object-cover"
              />
              <figcaption className="p-5">
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-gold">
                  {display.category}
                </p>
                <h2 className="mt-2 text-lg leading-snug">{display.zone}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {display.description}
                </p>
              </figcaption>
            </figure>;
          })}
        </div>

        <div className="mt-16 border border-border bg-card p-8 text-center">
          <h2 className="text-2xl">{t("res.cta.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {t("res.cta.body")}
          </p>
          <BookingDialog>
            <Button className="mt-6 rounded-none px-6">{t("cta.book")}</Button>
          </BookingDialog>
        </div>
      </div>
    </div>
  );
}
