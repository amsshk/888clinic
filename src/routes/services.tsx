import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Treatments — 888clinic Dermatology" },
      {
        name: "description",
        content:
          "Medical and aesthetic dermatology at 888clinic: acne care, eczema, mole checks, laser, peels, microneedling and injectables.",
      },
      { property: "og:title", content: "Treatments — 888clinic Dermatology" },
      {
        property: "og:description",
        content:
          "Explore medical and aesthetic dermatology treatments offered at 888clinic.",
      },
    ],
  }),
  component: Services,
});

const groups: { label: TKey; items: [TKey, TKey][] }[] = [
  {
    label: "svc.group.medical",
    items: [
      ["svc.acne", "svc.acne.body"],
      ["svc.eczema", "svc.eczema.body"],
      ["svc.rosacea", "svc.rosacea.body"],
      ["svc.mole", "svc.mole.body"],
    ],
  },
  {
    label: "svc.group.aesthetic",
    items: [
      ["svc.laser", "svc.laser.body"],
      ["svc.peel", "svc.peel.body"],
      ["svc.rf", "svc.rf.body"],
      ["svc.inject", "svc.inject.body"],
    ],
  },
];

function Services() {
  const { t } = useLang();
  return (
    <div>
      <section className="bg-shell">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="eyebrow">{t("svc.eyebrow")}</p>
          <h1 className="mt-4 max-w-2xl text-5xl leading-tight">
            {t("svc.title1")}{" "}
            <span className="text-gradient-gold">{t("svc.title2")}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            {t("svc.lede")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-16">
        {groups.map((group) => (
          <section key={group.label} className="mb-16 last:mb-0">
            <div className="flex items-center gap-5">
              <h2 className="shrink-0 text-3xl">{t(group.label)}</h2>
              <div className="hairline w-full" />
            </div>
            <div className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2">
              {group.items.map(([title, body]) => (
                <article
                  key={title}
                  className="flex flex-col justify-between bg-card p-7 transition-colors hover:bg-accent/40"
                >
                  <div>
                    <h3 className="text-xl">{t(title)}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {t(body)}
                    </p>
                  </div>
                  <p className="mt-6 text-sm font-semibold tracking-wide text-gold-deep">
                    {t("svc.from")}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-6 border-t border-border pt-10">
          <p className="max-w-md text-sm text-muted-foreground">
            {t("svc.foot")}
          </p>
          <Button asChild size="lg" className="rounded-none px-7">
            <Link to="/contact">
              {t("home.cta.consult")} <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
