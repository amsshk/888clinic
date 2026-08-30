import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCheckoutDialog } from "@/components/site/ProductCheckoutDialog";
import { formatThb, type SkincareProduct } from "@/lib/skincare-catalog";
import { useCatalog } from "@/hooks/useCatalog";
import { asSkincareProduct, findAlternative, type CatalogItem } from "@/lib/catalog.shared";
import { useLang, type TKey } from "@/lib/i18n";
import { localizeCatalogItem } from "@/lib/public-content";
import productsImg from "@/assets/products.jpg";


export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Clinical Skincare — 888clinic" },
      {
        name: "description",
        content:
          "Shop the 888clinic clinical skincare range: cleansers, serums, retinoids, moisturisers and sunscreen formulated by our dermatologists.",
      },
      { property: "og:title", content: "Clinical Skincare — 888clinic" },
      {
        property: "og:description",
        content:
          "Dermatologist-formulated cleansers, serums, retinoids and sunscreen from 888clinic.",
      },
    ],
  }),
  component: Products,
});

const filters =  ["All", "Cleanse", "Treat", "Hydrate", "Protect"] as const;

function Products() {
  const { t, lang } = useLang();
  const [active, setActive] = useState<(typeof filters)[number]>("All");
  const [selected, setSelected] = useState<SkincareProduct | null>(null);

  const { items } = useCatalog("skincare");

  const visible = useMemo(() => {
    const inFilter =
      active === "All" ? items : items.filter((p) => (p.category ?? "Treat") === active);
    // In-stock first so a sold-out formula never sits above what patients can buy.
    return [...inFilter].sort((a, b) => Number(b.available) - Number(a.available));
  }, [active, items]);

  const soldOutCount = useMemo(() => items.filter((i) => !i.available).length, [items]);

  const buy = (item: CatalogItem) => setSelected(asSkincareProduct(item));


  return (
    <div>
      <section className="bg-shell">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow">{t("prod.eyebrow")}</p>
            <h1 className="mt-4 text-5xl leading-tight">
              {t("prod.title1")}
              <br />
              <span className="text-gradient-gold">{t("prod.title2")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              {t("prod.lede")}
            </p>
          </div>
          <img
            src={productsImg}
            alt="888clinic skincare bottles and jars"
            width={1408}
            height={1008}
            className="w-full object-cover shadow-soft"
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActive(f)}
              className={`border px-5 py-2 text-xs uppercase tracking-widest transition-colors ${
                active === f
                  ? "border-gold bg-accent text-foreground"
                  : "border-border text-muted-foreground hover:border-gold/60"
              }`}
            >
              {t(`prod.filter.${f}` as TKey)}
            </button>
          ))}
        </div>

        {soldOutCount > 0 && (
          <p className="mt-6 border border-gold/40 bg-accent/40 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
            {soldOutCount === 1
              ? t("prod.soldout.one")
              : t("prod.soldout.many", { n: soldOutCount })}{" "}
            {t("prod.soldout.tail")}
          </p>
        )}

        <div className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
            const display = localizeCatalogItem(p, lang);
            const alt = p.available ? null : findAlternative(p, items);
            const displayAlt = alt ? localizeCatalogItem(alt, lang) : null;
            return (
              <article
                key={p.id}
                className={`relative flex flex-col bg-card p-7 ${p.available ? "" : "bg-secondary/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="eyebrow">
                    {t(`prod.filter.${p.category ?? "Treat"}` as TKey)}
                  </span>
                  {!p.available && (
                    <span className="border border-border bg-background px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {t("prod.outofstock")}
                    </span>
                  )}
                </div>
                <h2 className={`mt-4 text-2xl ${p.available ? "" : "text-muted-foreground"}`}>
                  {display.name}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{display.note}</p>
                <ul className="mt-5 space-y-1.5">
                  {display.actives.map((a) => (
                    <li key={a} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="size-3.5 text-gold" /> {a}
                    </li>
                  ))}
                </ul>

                {!p.available && (
                  <div className="mt-5 border border-border bg-background p-4">
                    {alt ? (
                      <>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {t("prod.closest")}
                        </p>
                        <p className="mt-1.5 text-sm font-semibold">{displayAlt?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatThb(alt.priceThb)}
                          {alt.size ? ` · ${alt.size}` : ""}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 w-full rounded-none border-gold/60"
                          onClick={() => buy(alt)}
                        >
                          {t("prod.buyInstead", { name: displayAlt?.name ?? alt.name })}
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t("prod.none")}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 flex items-end justify-between border-t border-border pt-5">
                  <div>
                    <p
                      className={`font-display text-2xl ${p.available ? "" : "text-muted-foreground line-through decoration-border"}`}
                    >
                      {formatThb(p.priceThb)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.size}
                      {p.refillThb
                        ? ` · ${t("prod.refill")} ${formatThb(p.refillThb)}/mo`
                        : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-none"
                    disabled={!p.available}
                    onClick={() => buy(display)}
                  >
                    {p.available ? t("prod.buy") : t("prod.unavailable")}
                  </Button>
                </div>
              </article>
            );
          })}

        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          {t("prod.foot")}
        </p>
      </div>

      <ProductCheckoutDialog product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
