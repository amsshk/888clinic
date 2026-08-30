import { BEFORE_AFTER, type BeforeAfterItem } from "@/lib/before-after";
import { useLang } from "@/lib/i18n";
import { localizeResult } from "@/lib/public-content";

function Row({
  items,
  direction,
  lang,
}: {
  items: BeforeAfterItem[];
  direction: "left" | "right";
  lang: "en" | "th";
}) {
  const loop = [...items, ...items];

  return (
    <div className="marquee-fade overflow-hidden">
      <div
        className={
          "flex w-max gap-4 " +
          (direction === "left" ? "animate-marquee-left" : "animate-marquee-right")
        }
      >
        {loop.map((item, i) => {
          const display = localizeResult(item, lang);
          return (
          <figure
            key={`${item.id}-${i}`}
            className="w-[190px] shrink-0 sm:w-[230px]"
          >
            <img
              src={item.url}
              alt={display.alt}
              loading="lazy"
              className="aspect-[4/5] w-full bg-shell object-cover"
            />
            <figcaption className="mt-2 text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
              {display.zone}
            </figcaption>
          </figure>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Slow-moving strip of real patient photos — the faces people arrive with,
 * before Dr Mali's scan and before treatment.
 */
export function ResultsMarquee() {
  const { t, lang } = useLang();
  const half = Math.ceil(BEFORE_AFTER.length / 2);
  const first = BEFORE_AFTER.slice(0, half);
  const second = BEFORE_AFTER.slice(half);

  return (
    <div className="space-y-4" aria-label={t("results.marqueeLabel")}>
      <Row items={first} direction="left" lang={lang} />
      <Row items={second} direction="right" lang={lang} />
    </div>
  );
}
