import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookingDialog } from "@/components/site/BookingDialog";
import { BEFORE_AFTER, RESULT_CATEGORIES, type ResultCategory } from "@/lib/before-after";
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
  const [hasFeatured, setHasFeatured] = useState<boolean | null>(null);

  const items = useMemo(
    () => (filter === "all" ? BEFORE_AFTER : BEFORE_AFTER.filter((i) => i.category === filter)),
    [filter],
  );

  const tabs: Array<"all" | ResultCategory> = ["all", ...RESULT_CATEGORIES];

  return (
    <div>
      <section className="bg-shell">
        <div className="mx-auto max-w-[90rem] px-5 py-16 text-center md:py-20">
          <h1 className="text-4xl uppercase tracking-[0.16em] text-gold md:text-5xl">
            {t("res.title1")} {t("res.title2")}
          </h1>
          <div className="mx-auto mt-6 flex max-w-xs items-center gap-4 text-gold">
            <span className="h-px flex-1 bg-gold/40" />
            <span className="text-xl">888</span>
            <span className="h-px flex-1 bg-gold/40" />
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t("res.lede")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[90rem] px-5 py-14">
        <div className="flex flex-wrap justify-center gap-8 md:gap-14">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={
                "border-b px-1 pb-3 text-[0.72rem] uppercase tracking-[0.16em] transition-colors " +
                (filter === tab
                  ? "border-gold text-gold"
                  : "border-transparent text-foreground hover:text-gold")
              }
            >
              {tab === "all" ? t("res.all") : localizeResultCategory(tab, lang)}
            </button>
          ))}
        </div>

        <FeaturedResultsMedia filter={filter} onAvailabilityChange={setHasFeatured} />

        {hasFeatured === false && (
          <div className="mt-12 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => {
              const display = localizeResult(item, lang);
              return (
                <figure key={item.id} className="min-w-0 text-center">
                  <img
                    src={item.url}
                    alt={display.alt}
                    loading="lazy"
                    className="aspect-square w-full rounded-2xl border border-gold/25 bg-white p-2 object-contain shadow-[0_14px_40px_rgba(73,52,31,0.08)]"
                  />
                  <figcaption className="px-2 pt-5">
                    <h2 className="text-base leading-snug">{display.zone}</h2>
                    <p className="mt-2 text-[0.68rem] uppercase tracking-[0.14em] text-gold">
                      {display.category}
                    </p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}

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
