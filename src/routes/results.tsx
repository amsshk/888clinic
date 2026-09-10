import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookingDialog } from "@/components/site/BookingDialog";
import { BEFORE_AFTER } from "@/lib/before-after";
import { FeaturedResultsMedia, type ResultsArea } from "@/components/site/FeaturedResultsMedia";
import { useLang } from "@/lib/i18n";
import { localizeResult } from "@/lib/public-content";

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

const tabs: Array<{ value: ResultsArea; label: string }> = [
  { value: "all", label: "All" },
  { value: "face", label: "Face" },
];

function ComparisonOverlay() {
  return (
    <div className="results-comparison-overlay" aria-hidden="true">
      <span className="results-comparison-divider" />
      <span className="results-comparison-arrow">›</span>
      <span className="results-comparison-label results-comparison-label--before">Before</span>
      <span className="results-comparison-label results-comparison-label--after">After</span>
    </div>
  );
}

function ResultsPage() {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<ResultsArea>("all");
  const [hasFeatured, setHasFeatured] = useState<boolean | null>(null);

  const fallbackItems = useMemo(() => BEFORE_AFTER, []);

  return (
    <main className="results-page">
      <section className="results-hero">
        <div className="results-container">
          <h1>Results</h1>

          <div className="results-divider" aria-hidden="true">
            <span />
            <strong>888</strong>
            <span />
          </div>

          <p className="results-lede">Real results. Real confidence.</p>

          <div className="results-filters" aria-label="Filter patient results">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={filter === tab.value ? "is-active" : undefined}
                aria-pressed={filter === tab.value}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="results-content">
        <div className="results-container results-container--wide">
          <FeaturedResultsMedia filter={filter} onAvailabilityChange={setHasFeatured} />

          {hasFeatured === false && fallbackItems.length > 0 && (
            <div className="results-gallery">
              <div className="results-grid">
                {fallbackItems.map((item) => {
                  const display = localizeResult(item, lang);

                  return (
                    <figure key={item.id} className="results-card">
                      <div className="results-media-frame">
                        <img
                          src={item.url}
                          alt={display.alt}
                          loading="lazy"
                          className="results-media"
                        />
                        <ComparisonOverlay />
                      </div>

                      <figcaption className="results-card-caption">
                        <h2>{display.zone}</h2>
                        <p>{display.category}</p>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="results-cta">
        <div className="results-container">
          <div className="results-cta__content">
            <p className="results-cta__eyebrow">888 Clinic</p>
            <h2>{t("res.cta.title")}</h2>
            <p>{t("res.cta.body")}</p>

            <BookingDialog>
              <Button className="results-cta__button rounded-none">{t("cta.book")}</Button>
            </BookingDialog>
          </div>
        </div>
      </section>
    </main>
  );
}
