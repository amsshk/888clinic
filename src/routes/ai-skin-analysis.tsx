import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanFace, ShieldAlert, FileText, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/hooks/useCatalog";
import { findAlternative } from "@/lib/catalog.shared";
import { useLang, type TKey } from "@/lib/i18n";


export const Route = createFileRoute("/ai-skin-analysis")({
  head: () => ({
    meta: [
      { title: "AI Skin Analysis — 888clinic" },
      {
        name: "description",
        content:
          "Upload a photo for an AI-assisted skin screening at 888clinic. One free scan on sign-up, then 3 scans for THB 500 — each scan comes with a clinic-branded PDF report.",
      },
      { property: "og:title", content: "AI Skin Analysis — 888clinic" },
      {
        property: "og:description",
        content:
          "AI-assisted skin screening with a clinic-branded report from MALI. One free scan when you create an account.",
      },
    ],
  }),
  component: AiSkinAnalysis,
});

const steps: [TKey, TKey][] = [
  ["ai.step1", "ai.step1.body"],
  ["ai.step2", "ai.step2.body"],
  ["ai.step3", "ai.step3.body"],
];

function AiSkinAnalysis() {
  const { t } = useLang();
  const { items: packs } = useCatalog("scan_pack");
  return (
    <div>
      <section className="bg-shell">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="eyebrow">{t("ai.eyebrow")}</p>
          <h1 className="mt-4 max-w-2xl text-5xl leading-tight">
            {t("ai.title1")}
            <br />
            <span className="text-gradient-gold">{t("ai.title2")}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            {t("ai.lede")}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-none px-7">
              <Link to="/mali" search={{ tool: "scan" as const }}>
                {t("ai.cta.free")} <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-none border-gold/60 px-7">
              <Link to="/contact">{t("ai.cta.derm")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h2 className="text-3xl">{t("ai.how")}</h2>
          <ol className="mt-8 space-y-px border border-border bg-border">
            {steps.map(([title, body], i) => (
              <li key={title} className="bg-card p-6">
                <span className="font-display text-3xl text-gold">0{i + 1}</span>
                <h3 className="mt-2 text-xl">{t(title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex gap-3 border border-border bg-secondary/60 p-5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold-deep" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("ai.triage")}
            </p>
          </div>

          <div className="mt-4 flex gap-3 border border-gold/30 bg-gold/5 p-5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold" />
            <div className="text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">{t("ai.limit.title")}</p>
              <p className="mt-1">{t("ai.limit.body")}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="border border-border bg-card p-8">
            <Gift className="size-6 text-gold" />
            <h2 className="mt-4 text-2xl">{t("ai.pricing")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("ai.pricing.body")}
            </p>
            <div className="mt-6 space-y-px bg-border">
              <div className="flex items-center justify-between bg-secondary/60 px-5 py-4">
                <p className="text-sm font-semibold">{t("ai.pricing.free")}</p>
                <p className="text-sm text-gold-deep">{t("ai.free")}</p>
              </div>
              {packs.map((pack) => {
                const alt = pack.available ? null : findAlternative(pack, packs);
                return (
                  <div
                    key={pack.id}
                    className={`flex items-center justify-between px-5 py-4 ${pack.available ? "bg-card" : "bg-secondary/40"}`}
                  >
                    <div>
                      <p
                        className={`text-sm font-semibold ${pack.available ? "" : "text-muted-foreground"}`}
                      >
                        {pack.credits ?? 1} {t("ai.scans")}
                        {!pack.available && (
                          <span className="ml-2 border border-border bg-background px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                            {t("ai.soldout")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pack.available
                          ? `฿${Math.round(pack.priceThb / (pack.credits ?? 1))} ${t("ai.perscan")}`
                          : alt
                            ? `${t("ai.tryPack", { n: alt.credits ?? 1 })} ฿${alt.priceThb.toLocaleString()}`
                            : t("ai.askClinic")}
                      </p>
                    </div>
                    <p
                      className={`text-sm ${pack.available ? "" : "text-muted-foreground line-through decoration-border"}`}
                    >
                      ฿{pack.priceThb.toLocaleString()}
                    </p>
                  </div>
                );
              })}

            </div>
            <Button asChild size="lg" className="mt-7 w-full rounded-none">
              <Link to="/mali" search={{ tool: "scan" as const }}>
                <ScanFace className="mr-2 size-4" /> {t("ai.cta.create")}
              </Link>
            </Button>
          </div>

          <div className="mt-6 border border-border bg-secondary/40 p-8">
            <FileText className="size-6 text-gold" />
            <h3 className="mt-4 text-xl">{t("ai.report.title")}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("ai.report.body")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
