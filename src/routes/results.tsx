import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookingDialog } from "@/components/site/BookingDialog";
import { FeaturedResultsMedia, type ResultsArea } from "@/components/site/FeaturedResultsMedia";
import { useLang } from "@/lib/i18n";

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

const tabs: Array<{ value: ResultsArea; en: string; th: string }> = [
  { value: "all", en: "All", th: "ทั้งหมด" },
  { value: "thread-lift", en: "Thread lift", th: "ร้อยไหม" },
  { value: "filler", en: "Dermal filler", th: "ฟิลเลอร์" },
];

function ResultsPage() {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<ResultsArea>("all");

  return (
    <div className="results-page">
      <section className="results-hero">
        <div className="results-container">
          <h1>Results</h1>

          <div className="results-divider" aria-hidden="true">
            <span />
            <strong>888</strong>
            <span />
          </div>

          <p className="results-lede">Real results. Real confidence.</p>
          <p className="results-disclaimer">
            {lang === "th" ? "ผลลัพธ์ขึ้นอยู่กับแต่ละบุคคล" : "Individual results vary."}
          </p>

          <div className="results-filters" aria-label="Filter patient results">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={filter === tab.value ? "is-active" : undefined}
                aria-pressed={filter === tab.value}
              >
                {tab[lang]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="results-content">
        <div className="results-container results-container--wide">
          <FeaturedResultsMedia filter={filter} />
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
    </div>
  );
}
